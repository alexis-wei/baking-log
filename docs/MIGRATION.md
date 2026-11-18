# Moving the baking log out of alexiswei.com

November 2026. `alexiswei.com/baking` became its own app: this repo, deployed
as the Vercel project **baking-log** at **https://baking-log-ten.vercel.app**.

## Approach: move the code, not the data

The app keeps using the **same Turso database and the same R2 bucket**.
Nothing is copied, so nothing can be lost in a copy. That works because:

- The database stores R2 **keys** (`baking/media/<log>/<file>.webp`), never
  full URLs. URLs are built from `R2_PUBLIC_URL` when a page renders, so the
  same bucket shows the same photos, videos and files on any domain.
- New uploads keep the `baking/` key prefix, next to the existing files.
- The schema code (`src/lib/db.ts`) is byte-for-byte the code that already
  ran on production, so the first boot finds every migration already applied
  and changes nothing.

The real risk in a move like this is **two apps writing to one database**.
So the cutover ends by replacing alexiswei.com's `/baking` with a redirect
([alexis-wei/alexiswei.com#66](https://github.com/alexis-wei/alexiswei.com/pull/66)),
which leaves this app as the only writer.

| Old                                  | New                                       |
| ------------------------------------ | ----------------------------------------- |
| `alexiswei.com/baking`               | `baking-log-ten.vercel.app/`              |
| `alexiswei.com/baking/<log id>`      | `baking-log-ten.vercel.app/<log id>`      |
| `alexiswei.com/baking/ingredients/…` | `baking-log-ten.vercel.app/ingredients/…` |
| `alexiswei.com/baking/recipes/…`     | `baking-log-ten.vercel.app/recipes/…`     |
| `/api/baking/upload`                 | `/api/upload`                             |

Old paths redirect (308) on both sides: alexiswei.com sends `/baking/...` here
once #66 is merged, and this app also accepts `/baking/...` and drops the prefix.

## Already done

- [x] Code moved, imports and links updated, all 156 tests pass unchanged
- [x] Typecheck, lint and production build clean; clicked through locally at
      phone width (list, log with photos and videos, unlock, upload)
- [x] Pushed to github.com/alexis-wei/baking-log (CI runs format, lint, types, tests)
- [x] Vercel project `baking-log` created and linked to the repo, Node 24,
      Vercel Authentication on **previews only**, so production is public
- [x] alexiswei.com cutover PR opened as a draft (#66): redirects + removes
      the old code. **Not merged.**

## Your steps

### 1. Back up first (10 min)

Before anything changes, take a full copy of the database and every file.

```bash
brew install tursodatabase/tap/turso   # already installed
turso auth login
turso db list                          # find the baking database's name
turso db tokens create <db-name> --read-only
```

In this repo, create `.env.migration.local` (gitignored) with three lines:

```bash
TURSO_DATABASE_URL=libsql://...   # from Vercel → alexiswei-com → Settings → Environment Variables (click the eye)
TURSO_AUTH_TOKEN=...              # the read-only token you just created
R2_PUBLIC_URL=https://pub-....r2.dev   # same place as TURSO_DATABASE_URL
```

Then:

```bash
pnpm install
pnpm backup
```

It prints the row count of every table and `files: N/N reachable`. It must
end with **0 missing from live rows**. The backup lands in `backups/<time>/`
(JSON for every table, plus every photo, video and recipe file). Copy that
folder somewhere safe, like iCloud or an external drive.

### 2. Environment variables in Vercel (10 min)

Vercel → **baking-log** → Settings → Environment Variables. Add each one for
the **Production** environment only. Leave Preview empty so preview builds can
never touch real data. Tick **Sensitive** for the secrets.

Vercel can't show you the values of variables marked Sensitive, including on
the old project. So three of these are **newly generated** rather than copied.
That's also the safer setup: the old site's credentials can be revoked later
without touching the new site.

| Variable                | Where the value comes from                                                                                                                    | Sensitive |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| `TURSO_DATABASE_URL`    | Copy from alexiswei-com (click the eye)                                                                                                       |           |
| `TURSO_AUTH_TOKEN`      | **New:** `turso db tokens create <db-name>` (read & write, no `--read-only`)                                                                  | ✓         |
| `R2_ACCOUNT_ID`         | Copy from alexiswei-com                                                                                                                       |           |
| `R2_BUCKET`             | Copy from alexiswei-com                                                                                                                       |           |
| `R2_PUBLIC_URL`         | Copy from alexiswei-com                                                                                                                       |           |
| `R2_ACCESS_KEY_ID`      | **New:** Cloudflare → R2 → _Manage R2 API Tokens_ → _Create API token_ → **Object Read & Write**, scoped to **that bucket only**. Shown once. | ✓         |
| `R2_SECRET_ACCESS_KEY`  | **New:** same screen as above                                                                                                                 | ✓         |
| `BAKING_PASSCODE`       | Copy from alexiswei-com (or pick a new passcode)                                                                                              | ✓         |
| `BAKING_SESSION_SECRET` | **New:** run `openssl rand -base64 32`                                                                                                        | ✓         |

A new `BAKING_SESSION_SECRET` only means unlocking editing once on the new
site, which you'd have to do anyway since cookies don't cross domains.

### 3. Let the new site upload to R2 (5 min)

The browser uploads straight to R2, so the bucket must allow the new origin.
Cloudflare → R2 → the bucket → Settings → **CORS policy** → Edit. **Add**
`https://baking-log-ten.vercel.app` to `AllowedOrigins` of the existing rule,
keeping the alexiswei.com origins for now. It should look like this:

```json
[
  {
    "AllowedOrigins": [
      "https://www.alexiswei.com",
      "https://baking-log-ten.vercel.app"
    ],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

Without this, the site still **shows** everything, but new photo uploads fail.

### 4. Deploy and check (10 min)

Vercel → baking-log → Deployments → latest → **Redeploy**. Then on your phone,
at https://baking-log-ten.vercel.app:

- [ ] The list shows the same logs as alexiswei.com/baking, with covers
- [ ] A log with videos plays them; ingredient icons and recipe files open
- [ ] `/edit` → passcode → "done editing" appears at the bottom
- [ ] Add a test photo to a log: it appears. Delete it (it goes to
      "recently deleted" and is purged in 30 days)
- [ ] `pnpm backup --check` still says 0 missing

**From here on, edit only on the new site** until step 5 is done.

### 5. Cut over (5 min)

Mark [alexiswei.com#66](https://github.com/alexis-wei/alexiswei.com/pull/66)
ready and merge it. After Vercel deploys alexiswei.com, open
`alexiswei.com/baking` and one old log link: both should land on the new site.

### 6. Clean up (a week later, once you're happy)

- Vercel → **alexiswei-com** → delete `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`,
  `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`,
  `R2_PUBLIC_URL`, `BAKING_PASSCODE`, `BAKING_SESSION_SECRET`.
- Cloudflare → R2 API tokens → delete the **old** token (the one whose key
  isn't the new site's `R2_ACCESS_KEY_ID`).
- R2 CORS → remove the alexiswei.com origins.
- Optional: the old Turso token. `turso db tokens invalidate <db-name>` revokes
  **every** token for the database, the new site's included. If you do it,
  create a fresh token straight away and replace `TURSO_AUTH_TOKEN` in
  baking-log, then redeploy.

## Rolling back

- **Before #66 is merged:** nothing to undo. alexiswei.com/baking still works.
- **After:** revert #66 on alexiswei.com and put its env vars back. The data
  is shared, so nothing needs restoring.
- **If data is ever lost:** `backups/<time>/` has every row and file. Turso
  also has point-in-time restore: `turso db create <new-name> --from-db <db-name> --timestamp <iso time>`.

## Later: a custom domain

To move from `baking-log-ten.vercel.app` to e.g. `baking.alexiswei.com`: add
the domain in Vercel → baking-log → Domains, add it to R2 CORS, and change
`BAKING_SITE` in alexiswei.com's `next.config.mjs`. Old vercel.app links keep
working.
