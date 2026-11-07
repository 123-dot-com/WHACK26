# Local development

This repository implements the initial architecture in README_EN.md: React/Vite,
Express, a shared TypeScript package, and PostgreSQL through Prisma 7.
The backend supports game creation, session tokens, state, daily news, opening the
market, and daily predictions. Gameplay screens and financial actions are next.

Use Node 24.11+ (Node 24 LTS is a suitable baseline) and Docker Desktop with Linux
containers. Run the following commands from the repository root. On Windows,
`npm.cmd` works even when PowerShell blocks the unsigned `npm.ps1` script.

## First run

```powershell
npm.cmd install
if (-not (Test-Path apps/server/.env)) {
  Copy-Item apps/server/.env.example apps/server/.env
}
npm.cmd run db:up
npm.cmd run db:generate
npm.cmd run db:migrate
npm.cmd run db:seed
npm.cmd run dev
```

The local `.env` is already provided for the initial checkout setup. On a fresh
clone, copy `.env.example` once; preserve an existing `.env` instead of replacing it.
The database credentials in Compose and `.env.example` are for local use only.

- Frontend: http://localhost:5173
- API and database readiness: http://localhost:3001/api/health
- API liveness without a database query: http://localhost:3001/api/health/live
- Prisma database browser: `npm.cmd run db:studio`

`npm.cmd run dev` builds shared contracts, generates Prisma Client, and watches all
three workspaces. The database must already be running. End development with Ctrl+C.
`npm.cmd run db:down` stops PostgreSQL while retaining its named data volume.

PostgreSQL uses host port 15432 to avoid Windows port reservations around 5432.
If port 15432 is occupied, change the host side of the Compose port mapping and the
port in `apps/server/.env` together. If changing the API port, also update Vite's
proxy target. Keep `CORS_ORIGIN` aligned with the frontend address.

## Checks

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

Tests cover request validation and the Prediction API, including authorization,
phase restrictions, persistence, rollback, and concurrent version checks.
PostgreSQL must be running for the server tests. Each run creates a uniquely named
temporary database, applies migrations, and removes that database afterward. The
local Docker role has the database creation privileges needed by this test setup.

If dependency installation fails with `Class extends value undefined`, the local
Node/npm installation contains incompatible npm internals. Reinstall the selected
Node version through your version manager before future dependency changes. The
initial dependencies were installed with a clean temporary npm; project build and
development scripts can still use `npm.cmd`.

For a production API process after building:

```powershell
npm.cmd run start -w @bullish/server
```

Supply `DATABASE_URL`, `PORT`, and `CORS_ORIGIN` in that process's environment.
The Vite `/api` proxy is for development only; deployed frontend hosting needs an
`/api` rewrite to Express or a separately configured API base URL.

## Code boundaries

| Folder | Responsibility |
| --- | --- |
| `apps/web/src/pages` | Game screens |
| `apps/web/src/components` | Reusable interface elements |
| `apps/web/src/api` | HTTP requests and response handling |
| `apps/web/src/hooks` | React state and data hooks |
| `packages/shared/src/types` | Public game DTOs |
| `packages/shared/src/schemas` | Zod request validation |
| `packages/shared/src/contracts` | API envelopes |
| `apps/server/src/routes` | Endpoint registration and middleware |
| `apps/server/src/controllers` | HTTP request/response mapping |
| `apps/server/src/services` | Game rules and database transaction orchestration |
| `apps/server/src/engines` | Pure calculations without database access |
| `apps/server/src/repositories` | Prisma queries, including transaction clients |
| `apps/server/src/data` | Fixed scenarios and news |
| `apps/server/src/lib` | Environment configuration and Prisma instance |

Only the server accesses Prisma. React submits player intent and displays the
authoritative response. Financial values use integer pence.

## Database changes

The initial migration creates GameSession, Wallet, and the Stock catalog, including
checks for valid days, nonnegative balances, and positive initial prices. The
repeatable seed upserts NOVA, GREEN, and FINX without resetting saved games.

Later migrations add session access, Holdings, StockPrice, and Prediction. Restore
an applied migration to its original contents if it was changed accidentally; put
new SQL, including CHECK constraints, in a new migration before applying it.

Add the remaining README section 6 models as their features are implemented:
Trade, BankTransaction, ArbitrageAttempt, DailyReport, and IdempotencyRecord.

After changing `apps/server/prisma/schema.prisma`:

```powershell
npm.cmd run db:migrate -- --name describe_your_change
npm.cmd run db:generate
```

Commit migration files and the root package-lock.json. Generated clients, build
outputs, dependencies, and local environment files are ignored.
Use `npm.cmd run db:deploy` to apply existing migrations during deployment.

## Prediction checkpoint

Create a game with `POST /api/games` and retain `data.gameId` and
`data.accessToken`. Send the token as `Authorization: Bearer <token>` on session
requests. Get the current version from `GET /api/games/:gameId`.

Send `POST /api/games/:gameId/prediction` with JSON:

```json
{
  "direction": "BULLISH",
  "expectedVersion": 0
}
```

This example uses a fresh game at version 0. The server chooses the focus stock
from that day's news and returns the updated GameStateDTO with version 1. Choices
are BULLISH, NEUTRAL, and BEARISH. A prediction can be changed during BRIEFING or
TRADING, with one saved record per game/day. Every successful save increments the
version; GET game returns the current day's saved choice. Predictions leave cash,
savings, holdings, and net worth unchanged.

Missing tokens return 401; wrong or another game's token returns 403. Invalid JSON
input returns 400; stale versions and closed phases return 409. Use the latest
version for each request, including `POST /api/games/:gameId/open-market`.

Next features are Trading, End Day and Reports, Bank and Arbitrage, then three-day
progression and Reset. Persist idempotency keys and add the remaining database
constraints before enabling financial mutation endpoints.
