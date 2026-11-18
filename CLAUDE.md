# CLAUDE.md

Guidance for Claude Code in this repository.

- Read [README.md](README.md) before changing anything. This app holds real
  data in production (Turso + Cloudflare R2).
- Every change adds or updates tests (`pnpm test`): new features get tests,
  changed behaviour updates the outdated tests in the same change, and bug
  fixes get a test that fails without the fix.
- Test against the local database (`pnpm dev` with no Turso env vars), never a
  Vercel preview, which may share the production database.
- Never run `pnpm backup` or anything else against production unless asked;
  it's read-only, but it still reads real data.

## Commands

- `pnpm dev` / `pnpm build` / `pnpm start`
- `pnpm test`, `pnpm lint`, `npx tsc --noEmit`, `pnpm format:check`
- `pnpm backup [--check]`: see README

## Stack

Next.js 16 (App Router), React 19, Tailwind CSS v4 (tokens in
`src/app/globals.css`), libSQL/Turso, Cloudflare R2 via presigned URLs
(`aws4fetch`), Vitest + Testing Library. Fonts: Plus Jakarta Sans (sans),
Libre Baskerville (serif), IBM Plex Mono (mono).
