# baking log

A public, mobile-first log of baking experiments. Anyone can read it; only
Alexis can edit, after unlocking with a passcode. It used to live at
`alexiswei.com/baking` and moved to its own repo and Vercel project in
November 2026 (see [docs/MIGRATION.md](docs/MIGRATION.md)).
**It holds real data**, so treat every change as a change to a live database.

```bash
pnpm install
pnpm dev        # http://localhost:3000, local SQLite + local uploads
pnpm test
```

## Where things live

| Path              | What                                                                                                                                         |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/`        | Pages (logs list, log, ingredients, ingredient, recipes, recipe, recently deleted, unlock) and `actions.ts` (every write, as server actions) |
| `src/app/api/`    | Upload signing for R2 (`upload`), plus a local-only stand-in for R2 (`local`)                                                                |
| `src/components/` | UI: page shell, log editor, timeline, gallery, ingredient and recipe popups, cropper, autosave                                               |
| `src/lib/`        | Database (`db.ts`), reads (`queries.ts`), 30-day trash (`trash.ts`), storage, image/video prep, formatting                                   |
| `scripts/`        | `backup.ts`: read-only backup of the database and every file, and a check that every file is reachable                                       |

Old `/baking/...` paths redirect to the same page without the prefix
(`next.config.mjs`), and alexiswei.com redirects `/baking/...` here.

## Environment

See [.env.example](.env.example). With nothing set, local dev uses
`.baking-local/baking.db` and stores uploads in `.baking-local/uploads/`.

| Variable                                   | What                                                    |
| ------------------------------------------ | ------------------------------------------------------- |
| `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`   | The Turso (libSQL) database                             |
| `R2_ACCOUNT_ID`, `R2_BUCKET`               | The Cloudflare R2 bucket holding photos, videos, files  |
| `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | An R2 API token with read & write on that bucket        |
| `R2_PUBLIC_URL`                            | The bucket's public address; media URLs are built on it |
| `BAKING_PASSCODE`, `BAKING_SESSION_SECRET` | The editing passcode, and the key that signs its cookie |

The R2 bucket's CORS policy must allow `PUT` from this site's origin, since
the browser uploads straight to R2.

## Data

- **Turso (SQLite)** in production. Without `TURSO_DATABASE_URL`, local dev uses
  `.baking-local/baking.db` and stores uploads in `.baking-local/uploads/`.
- **Vercel previews use whatever database their env vars point at.** If preview
  has the production values, don't test on a preview with data you care about;
  test locally.
- **The database stores R2 keys, not URLs** (`baking/media/<log>/<file>`, etc.).
  URLs are built from `R2_PUBLIC_URL` at render time, so moving the bucket's
  public address only needs that variable changed.
- **Schema changes run automatically on server start** (`migrate` in `db.ts`):
  - `SCHEMA`: tables and indexes (`CREATE … IF NOT EXISTS`). New tables use `STRICT`.
  - `ADDED_COLUMNS`: new columns on existing tables. Additive and safe.
  - `DROPPED_COLUMNS`: **deletes data for good.** Only add a column here when that's the intent.
  - `DATA_MIGRATIONS`: one-time data moves, recorded in `schema_migrations` so they never run twice.
    Leave the old data in place as a backup rather than deleting it in the same change.
- **Deletes are soft.** Rows get `deleted_at`, are hidden everywhere, can be restored
  from "recently deleted" for 30 days, and are then purged with their R2 files
  (`purgeExpired`). Any new table that belongs to a log must be handled in
  `trash.ts`, both in the purge and, if users can delete it, in `listDeleted`.
- **Timeline step times** are "YYYY-MM-DDTHH:MM". Older steps may hold "HH:MM";
  `resolveStepTimes` reads them on the log's date, rolling to the next day when
  time goes backwards. Gaps between steps are computed on render, not stored.
- **Photos ↔ steps:** a photo belongs to at most one step via `media.step_id`
  (a step can have many photos). The link is by id, so reordering steps never
  loses it. Deleting a step unlinks its photos; they stay in the gallery.
- **Recipes** are a library, like ingredients: `recipes` (name, link, pasted
  text) with files in `recipe_files.recipe_id`, and `log_recipes` for which
  recipes a log uses (several per log, ordered). Before the library, each log
  held its own `recipe_url`, `recipe_text` and files (`recipe_files.log_id`);
  the `2026-10-recipe-library` migration turned each into a recipe named after
  its log. Deleting a recipe hides it from its logs; its files go with it.
- **Old columns are dropped in a later release than the move.** Once production
  was checked on `timeline_steps` and the recipe library, the
  `2026-10-drop-pre-library-columns` migration dropped `logs.timeline`,
  `logs.recipe_url`, `logs.recipe_text` and `recipe_files.log_id`. Drops that
  depend on a data move go in `DATA_MIGRATIONS` after it (not
  `DROPPED_COLUMNS`, which runs first), so no database loses data before it's
  copied.
- **Ordering** (timeline steps, photos, ingredients, recipe files) is an integer
  `position` per log. Reordering rewrites the positions of that log's rows in one
  batch. Gaps are fine; only the order matters.
- **Files** go straight from the browser to R2 with a presigned URL. Log photos
  and videos are resized to 1080p first, ingredient icons are 720×720 (with a
  ≤720px original kept for re-cropping), and recipe files are stored untouched.

## Backups

```bash
pnpm backup           # backups/<timestamp>/: every table as JSON + every file
pnpm backup --check   # only check every file the database points at is reachable
```

Reads `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` and `R2_PUBLIC_URL` from
`.env.migration.local` (gitignored). A read-only Turso token is enough:
`turso db tokens create <db> --read-only`. It never writes to the database or
bucket. `backups/` is gitignored; keep it somewhere safe.

## Tests

```bash
pnpm test
```

CI runs this on every push and pull request.

**Every change comes with tests:**

- **New feature:** add tests for what it does, including the failure path (failed save, bad input).
- **Changed behaviour:** update the tests that describe the old behaviour in the
  same change. Don't delete or loosen a failing test to get green; fix the code or
  rewrite the test to describe the new intended behaviour.
- **Bug fix:** add a test that fails without the fix (check this by running it against the old code once).
- **Database change** (new table/column, migration, ordering, trash): cover it in
  `__tests__/data/`, including the "existing database" case in `migrations.test.ts`.

Tests live in `src/app/__tests__/`, grouped by **page** (what you see and do
there) and by **function** (data and helpers). Put a new test in the folder
that matches what it checks, and add it to this table:

| Folder          | File                        | Covers                                                                                                                                 |
| --------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `all-pages/`    | `editing.test.tsx`          | Pinned "done editing" button while unlocked; visitors' "edit" link                                                                     |
| `log-page/`     | `timeline.test.tsx`         | Adding, inserting, reordering and deleting steps (edit mode); step menu; per-step saving; dates, gaps (readers only) and units         |
| `log-page/`     | `step-photos.test.tsx`      | Linking photos to steps from either side; links surviving reorders and deletes                                                         |
| `log-page/`     | `log-recipes.test.tsx`      | Picking several recipes for a log; adding one from a link, pasted text or files; saving on every exit                                  |
| `log-page/`     | `ingredient-popup.test.tsx` | Adding an ingredient from a log (with image), "+ new", saving on every exit                                                            |
| `log-page/`     | `autosave.test.tsx`         | Debounced, ordered, retrying autosave                                                                                                  |
| `recipes-page/` | `library.test.tsx`          | The recipes list: links, what each recipe holds, search                                                                                |
| `recipes-page/` | `recipe-content.test.tsx`   | A recipe's link and pasted text saving; long recipes collapsed when reading                                                            |
| `data/`         | `migrations.test.ts`        | Schema and data migrations on a production-shaped database (timeline steps, recipe library, dropping the old columns) and on a new one |
| `data/`         | `timeline-steps.test.ts`    | Step insert/reorder/update/delete in the database                                                                                      |
| `data/`         | `photo-steps.test.ts`       | `media.step_id` links: same-log only, moves, reorders, step deletes, restores                                                          |
| `data/`         | `recipes.test.ts`           | Recipes and their files, logs sharing recipes, delete/restore/purge                                                                    |
| `data/`         | `trash.test.ts`             | The 30-day purge of logs, steps and photos                                                                                             |
| `helpers/`      | `format.test.ts`            | Safe recipe links, recipe summaries, bake start/end and durations, reading units                                                       |
| `helpers/`      | `step-times.test.ts`        | Step dates (incl. older time-only steps), gaps, date labels                                                                            |
| `helpers/`      | `order.test.ts`             | Reorder helpers, drop position, cover choice                                                                                           |
| `helpers/`      | `image.test.ts`             | 1080p sizing, saved ingredient crops                                                                                                   |
| `helpers/`      | `capture.test.ts`           | Photo capture time from EXIF                                                                                                           |

Database tests use `data/harness.ts`. Each one runs the real code against a
fresh in-memory SQLite database, never Turso or the local dev file.

**Before shipping:** run `pnpm test`, `pnpm lint`, `npx tsc --noEmit` and a
production build, then click through the change locally at phone width.
