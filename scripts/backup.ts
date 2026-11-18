// Read-only backup and check of the production baking log.
//
//   pnpm backup            dump every table to JSON and download every file
//   pnpm backup --check    only check that every file the database points at
//                          is reachable at R2_PUBLIC_URL (nothing written)
//
// Needs TURSO_DATABASE_URL, TURSO_AUTH_TOKEN (a read-only token is enough) and
// R2_PUBLIC_URL, e.g. from .env.migration.local (see the pnpm script). Writes
// to backups/<timestamp>/, which is gitignored. Exits 1 if a file that a live
// (not deleted) row points at can't be fetched.

import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@libsql/client";

const { TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, R2_PUBLIC_URL } = process.env;
if (!TURSO_DATABASE_URL || !R2_PUBLIC_URL) {
  console.error("Set TURSO_DATABASE_URL, TURSO_AUTH_TOKEN and R2_PUBLIC_URL.");
  process.exit(2);
}

const checkOnly = process.argv.includes("--check");
const base = R2_PUBLIC_URL.replace(/\/$/, "");
const db = createClient({
  url: TURSO_DATABASE_URL,
  authToken: TURSO_AUTH_TOKEN,
});
const out = path.join(
  "backups",
  new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19),
);

// Every column that holds an R2 key, with the row's soft-delete column.
const FILE_COLUMNS = [
  { table: "media", column: "key" },
  { table: "ingredients", column: "image_key" },
  { table: "ingredients", column: "source_key" },
  { table: "recipe_files", column: "key" },
];

type FileRef = { key: string; table: string; deleted: boolean };

async function tables() {
  const { rows } = await db.execute(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
  );
  return rows.map((row) => String(row.name));
}

async function fileRefs() {
  const refs = new Map<string, FileRef>();
  for (const { table, column } of FILE_COLUMNS) {
    const { rows } = await db.execute(
      `SELECT ${column} AS key, deleted_at FROM ${table} WHERE ${column} IS NOT NULL AND ${column} != ''`,
    );
    for (const row of rows) {
      const key = String(row.key);
      const deleted = row.deleted_at != null;
      // A key shared by a live and a deleted row counts as live.
      const known = refs.get(key);
      if (!known || (known.deleted && !deleted)) {
        refs.set(key, { key, table, deleted });
      }
    }
  }
  return [...refs.values()];
}

async function fetchFile(ref: FileRef) {
  const url = `${base}/${ref.key}`;
  if (checkOnly) {
    const response = await fetch(url, { method: "HEAD" });
    return response.ok;
  }
  const target = path.join(out, "files", ref.key);
  const existing = await stat(target).catch(() => null);
  if (existing?.size) return true;
  const response = await fetch(url);
  if (!response.ok) return false;
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, Buffer.from(await response.arrayBuffer()));
  return true;
}

/** Runs `task` over `items`, `limit` at a time. */
async function pool<T, R>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<R>,
) {
  const results: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (next < items.length) {
        const index = next++;
        results[index] = await task(items[index]);
      }
    }),
  );
  return results;
}

const counts: Record<string, number> = {};
for (const table of await tables()) {
  const { rows } = await db.execute(`SELECT * FROM ${table}`);
  counts[table] = rows.length;
  if (!checkOnly) {
    await mkdir(path.join(out, "db"), { recursive: true });
    await writeFile(
      path.join(out, "db", `${table}.json`),
      JSON.stringify(rows, null, 2),
    );
  }
}

const refs = await fileRefs();
let done = 0;
const ok = await pool(refs, 8, async (ref) => {
  const fetched = await fetchFile(ref).catch(() => false);
  done++;
  if (done % 25 === 0 || done === refs.length) {
    process.stdout.write(`\rfiles: ${done}/${refs.length}`);
  }
  return fetched;
});
process.stdout.write("\n");

const missing = refs.filter((_, index) => !ok[index]);
const missingLive = missing.filter((ref) => !ref.deleted);
const summary = {
  at: new Date().toISOString(),
  mode: checkOnly ? "check" : "backup",
  rows: counts,
  files: {
    total: refs.length,
    live: refs.filter((ref) => !ref.deleted).length,
    reachable: refs.length - missing.length,
  },
  missingLive,
  missingDeleted: missing.filter((ref) => ref.deleted),
};

console.table(counts);
console.log(
  `files: ${summary.files.reachable}/${summary.files.total} reachable` +
    ` (${missingLive.length} missing from live rows, ${summary.missingDeleted.length} from deleted rows)`,
);
if (!checkOnly) {
  await writeFile(
    path.join(out, "summary.json"),
    JSON.stringify(summary, null, 2),
  );
  console.log(`saved to ${out}/`);
}
for (const ref of missingLive) console.log(`MISSING ${ref.table}: ${ref.key}`);
process.exit(missingLive.length ? 1 : 0);
