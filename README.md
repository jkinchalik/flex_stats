# Flex Stats

A fun, public dashboard tracking League of Legends Flex queue (queueId 440) for my friend group. Shows a live leaderboard and a set of seasonal awards (Inting Champion, Vision God, Highest Climber, etc.). Built with Next.js 16, Drizzle, Postgres on Railway, and the Riot Games API.

## Quick start (local)

1. `cp .env.example .env.local` and fill in. Generate `CRON_SECRET` with `openssl rand -hex 32`.
2. Get a Riot API key from [developer.riotgames.com](https://developer.riotgames.com).
3. Edit `src/config/roster.ts` to list your friends' Riot IDs (`GameName#TAG` format).
4. Edit `src/config/splits.ts` if Riot's split dates need updating.
5. Provision Postgres anywhere (Railway, Neon, local Docker) and put the connection string in `DATABASE_URL`.
6. `npm install && npm run db:push` (creates the schema).
7. `npm run dev` then `curl -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/sync` to populate.
8. Visit `http://localhost:3000`.

## Probe a single player

`npx tsx scripts/probe.ts "GameName#TAG"` to sanity-check Riot API access without touching the DB.

## Deploy (Railway)

The intended host is Railway. Both the Next.js service and the Postgres service live in the same Railway project. Set `DATABASE_URL` to reference the Postgres service (Railway provides this as a service-link variable). Set `RIOT_API_KEY`, `RIOT_PLATFORM`, `RIOT_REGION`, and `CRON_SECRET` directly. Generate a public domain via `railway domain`. The sync cron is driven by GitHub Actions (see `.github/workflows/sync.yml`) so it runs even when no traffic is hitting the app.

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
| `DATABASE_URL` | Postgres connection string. |
| `CRON_SECRET` | Bearer token required to call `/api/sync`. Generate with `openssl rand -hex 32`. |

## Adding awards

Awards live in `src/lib/stats/awards.ts`. Each is a pure function over `LeaderboardRow[]` (and an optional supplementary query). Add new awards by appending to the returned array.

## Tech stack

- Next.js 16 (App Router) + TypeScript (strict)
- Tailwind CSS v4
- Drizzle ORM (`drizzle-orm/node-postgres`)
- Postgres (Railway)
- recharts
- Riot Games API
