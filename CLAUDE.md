# Flex Stats — project guide

## Heads-up on Next.js

This project runs on Next.js 16 (see `package.json`). The Next.js you may have learned from training data is older — APIs, conventions, and file structure can differ. Read the relevant guide in `node_modules/next/dist/docs/` before making non-trivial framework changes, and heed deprecation notices.

## Stack

Next.js 16 App Router + TypeScript (strict) + Tailwind v4 + Drizzle (`node-postgres`) + Postgres on Railway + recharts.

## Where things live

- DB schema: `src/lib/db/schema.ts`
- Riot client: `src/lib/riot/{client,account,summoner,league,match}.ts`
- Sync logic: `src/lib/sync/sync.ts` (idempotent; dedupes match IDs across roster)
- Stats: `src/lib/stats/{leaderboard,awards,player,ranks,splits}.ts`
- Pages: `src/app/page.tsx` (home), `src/app/players/[puuid]/page.tsx`
- Cron: `.github/workflows/sync.yml` (GitHub Actions) hits `POST /api/sync` every 30 min, gated by `Bearer $CRON_SECRET`
- Config: `src/config/{roster,splits}.ts`

## Conventions

- Strict TS. No `any`.
- Tailwind utility classes; no shadcn.
- All Riot fetches go through `riotFetch` (handles 429 / 5xx / rate limit).
- `match_participants` only stores rostered puuids (not all 10 players in a match). When a roster member joins later, only their future matches will be tracked.
- Sync is idempotent: re-running shouldn't insert duplicate matches or spurious `rank_history` rows.

## Common tasks

- **Add a friend**: edit `src/config/roster.ts`, redeploy. First sync after deploy will resolve their PUUID.
- **Add an award**: append to the array in `src/lib/stats/awards.ts`.
- **Update split dates**: edit `src/config/splits.ts`.
- **Schema change**: edit `src/lib/db/schema.ts`, run `npm run db:push` (or `db:generate` for migration files).
