# Local development

This repository implements the initial architecture in README_EN.md: React/Vite,
Express, a shared TypeScript package, and PostgreSQL through Prisma 7.
The app supports a complete three-day game: briefing, predictions, trading,
bank transfers and interest, daily arbitrage, deterministic crowd/market simulation,
daily/final reports, and Reset. All screens use the authoritative API state.

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

Tests cover request validation, pure financial/simulation engines and real HTTP
gameplay, including authorization, phase restrictions, persistence, rollback,
concurrent version checks, persisted idempotency and three-day progression.
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

The core-gameplay migration adds Trade, BankTransaction, ArbitrageAttempt,
DailyReport and IdempotencyRecord. It includes financial CHECK constraints and
a partial unique index allowing only one INTEREST credit per game/day.

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

## Gameplay and safe retries

The routes in README section 7 are implemented. Financial actions, End Day,
Next Day and Reset require `Idempotency-Key` (1–128 ASCII letters, digits or
`._:-`) and a JSON `expectedVersion`. A successful response contains the updated
GameStateDTO. The arbitrage response includes the settled wallet and
`arbitrage.completedToday`; the breakdown is persisted and shown in the report.
GET game includes historical report snapshots in `reports`; individual reports
are also available at `GET /api/games/:gameId/reports/:day`.

Use a fresh key for each intended action. Retry an interrupted action with the
same key and identical payload, including the original version. PostgreSQL stores
the operation/payload hash and exact success envelope in the same transaction as
the financial changes. Reusing a key with a different payload/operation returns
409 IDEMPOTENCY_CONFLICT. Invalid quantities/stocks return 400
INVALID_QUANTITY/INVALID_STOCK; insufficient balances/holdings return 422.

The mutation service locks the session row, checks the recorded key before the
version, validates the phase, applies repository writes, increments the version,
and records the response atomically. This serializes competing financial actions
with predictions/open-market, whose conditional version updates lock the same row.
End Day loads a Repeatable Read snapshot and computes the engines before entering
the write transaction; it validates the original version again before settlement.

Prices use whole-penny ticks inside the ±10% band: ceil(90% of current price)
through floor(110%), with a one-penny floor. A penny-priced stock may stay flat.
Reports expose crowd/noise contributions and cap/tick adjustments separately.
Day 3 closes directly into FINISHED and retains its daily report. Reset clears
gameplay history but preserves the access token, seed, monotonic version and old
request keys so a delayed retry cannot execute again after a reset.

The browser stores only the session ID/token in localStorage. It reloads game
state from the API, displays pending actions without changing balances optimistically,
refreshes on 409, and reuses the original key/payload when retrying a connection
failure. Currency entry is parsed to integer pence before sending requests.

Vite proxies `/api` to `http://localhost:3001`; set `API_PROXY_TARGET` for a
different local API. The web package participates in the root typecheck command.
