# Flex Stats

A fun, public dashboard tracking League of Legends Flex queue (queueId 440) for my friend group. Shows a live leaderboard and a set of seasonal awards (Inting Champion, Vision God, Highest Climber, etc.). Built with Next.js 15, Drizzle, Neon Postgres, and the Riot Games API.

## Quick start

1. Create a Neon project at [neon.tech](https://neon.tech), copy `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct).
2. Get a Riot API key (personal or production) from [developer.riotgames.com](https://developer.riotgames.com).
3. `cp .env.example .env.local` and fill in. Generate `CRON_SECRET` with `openssl rand -hex 32`.
4. Edit `src/config/roster.ts` to list your friends' Riot IDs (`GameName#TAG` format).
5. Edit `src/config/splits.ts` if Riot's split dates need updating.
6. `npm install && npm run db:push` (creates the schema in Neon).
7. Trigger a first sync: `curl -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/sync` (after running `npm run dev`).
8. Visit `http://localhost:3000`.

## Probe a single player

`npx tsx scripts/probe.ts "GameName#TAG"` to sanity-check Riot API access without touching the DB.

## Deploy

Push to GitHub, link in Vercel, attach the same Neon project, add all env vars, deploy. Cron runs every 30 min via `vercel.json`.

## Project layout

```
src/
  app/             # Next.js App Router pages + API routes
  components/      # UI components
  config/          # roster.ts, splits.ts
  lib/
    riot/          # Riot API client + endpoint wrappers
    db/            # Drizzle schema + connection
    stats/         # leaderboard, awards, player, ranks, splits
    sync/          # sync entrypoint (idempotent)
```

## Environment variables

| Variable | Meaning |
|---|---|
| `RIOT_API_KEY` | Riot Games API key (personal or production). |
| `RIOT_PLATFORM` | Platform routing value (e.g. `na1`, `euw1`, `kr`). |
| `RIOT_REGION` | Regional routing value (e.g. `americas`, `europe`, `asia`). |
| `RIOT_APP_RATE_LIMIT` | Optional. Override the default `100:120` (count:seconds) app budget. |
| `DATABASE_URL` | Pooled Neon Postgres connection. Used at runtime. |
| `DATABASE_URL_UNPOOLED` | Direct Neon connection. Used for migrations / `db:push`. |
| `CRON_SECRET` | Bearer token required to call `/api/sync`. Generate with `openssl rand -hex 32`. |

## Adding awards

Awards live in `src/lib/stats/awards.ts`. Each is a pure function over `LeaderboardRow[]` (and an optional supplementary query). Add new awards by appending to the returned array.

## Tech stack

- Next.js 15 (App Router) + TypeScript (strict)
- Tailwind CSS v4
- Drizzle ORM (`drizzle-orm/neon-http`)
- Neon Postgres
- recharts
- Riot Games API
