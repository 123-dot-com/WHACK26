# Gameplay architecture

This is a modular monolith following README_EN.md. PostgreSQL is authoritative;
React sends intent and displays confirmed state. Monetary balances use integer
pence, rates use basis points, and quantities use whole shares.

```text
web/pages -> web/hooks + components -> web/api
                                         |
                               shared DTOs / strict Zod inputs
                                         |
server/routes -> controllers -> services -> repositories -> Prisma/PostgreSQL
                                  |
                               engines
```

- **Routes/middleware** register endpoints and enforce the per-session token.
- **Controllers** parse requests and map service results into HTTP envelopes.
- **Services** enforce phases/versioning and coordinate transactions.
- **Repositories** implement the new gameplay queries and persistence operations.
- **Engines** calculate trades, transfers, interest, arbitrage, crowd votes, prices
  and reports without database or browser I/O.
- **Shared** contains public DTOs and input contracts, without Prisma types.
- **Web API** owns HTTP, token headers and typed error handling.
- **GameProvider/hooks** restore the session, accept server snapshots, serialize
  user actions and manage pending/retry/error state. Pages contain screen-specific
  controls; shared layout, trade cards and report rendering live in components.

## Mutation boundary

`game-mutation.service.ts` owns the write transaction for financial actions,
End Day, Next Day and Reset. It locks the session row before loading state and
checks the persisted idempotency key before the expected version. An exact retry
returns its original response. A key reused for a different operation/payload is
rejected. Successful mutations update all related rows, increment the session
version and save the response atomically; any failure rolls everything back.

Prediction/open-market retain conditional version updates on the same session
row, so they also serialize with financial actions. Reset preserves monotonically
increasing versions and old request keys; it cannot make delayed old actions valid
again. An old replay can return an earlier snapshot, which the browser will not
apply over a newer version.

## End Day

Read game inputs in a Repeatable Read transaction. Compute the six-group,
100-agent crowd and prices outside the write transaction. Each stock/day uses
independent seeded random streams for agent and market noise. News influences
votes; it is not added to prices a second time. Report attribution distinguishes
crowd, noise, the 10% cap and whole-penny rounding.

At settlement, lock the session and recheck the version/phase. Persist closing
prices, one monthly savings-interest credit and a historical report snapshot in
the same transaction. Unique constraints protect prices, reports, interest and
arbitrage attempts. Day 3 transitions directly to FINISHED; earlier days enter
REPORT and require Next Day to open the next BRIEFING.

## Pixel interface

Start creates a server session and opens `/WakeUp`: sleep, wake, pick up the
phone, then `/Briefing`. The sequence is cosmetic, can be skipped, and skips
automatically for reduced motion. Next Day and Reset also enter this sequence;
resuming a saved session goes directly to its current phase.

`components/pixel/ChibiSprite.tsx` is a React wrapper around a four-by-four local
sprite atlas. An animation prop selects a row and CSS `steps(4)` advances frames;
the component also supports paused frames, display size and facing direction.
It has no game-state authority or animation-library dependency.

The app dock exposes News, Stocks, Arbitrage and Bank as buttons. Selecting a
financial app during BRIEFING first confirms open-market through the API, then
navigates. The profile avatar links to Portfolio. Only Bank has a full environment
background; the other activities use the same compact phone UI. Assets and their
generation prompts are documented in `apps/web/public/art/README.md`. Pixel fonts
are served locally with their SIL Open Font Licenses in `public/fonts`.

## Validation

`npm run typecheck`, `npm test` and `npm run build` cover both application layers.
HTTP integration tests use a fresh PostgreSQL database per suite, including
concurrent spends, duplicate requests, injected write failures and three-day
progression. See SETUP.md for local startup, migration and request examples.
