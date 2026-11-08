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

The game fills the viewport. `/Room` is the scene hub (`/WakeUp` redirects there).
Start puts the player in bed in the morning. The player clicks the bed to wake,
then the bedside phone to read `/Briefing`. The room waits for input, including
with reduced motion. Reset returns to the same initial state.

`components/pixel/ChibiSprite.tsx` is a React wrapper around a four-by-four local
sprite atlas. An animation prop selects a row and CSS `steps(4)` advances frames;
the component also supports paused frames, display size and facing direction.
It has no game-state authority or animation-library dependency.

Persistent screen options expose Room, Stocks, Arbitrage and Bank; Reports appears
after a day closes. Selecting a financial activity during BRIEFING first confirms
open-market through the API. Stocks, Arbitrage, Portfolio and reports use activity
panels. The phone contains only news/messages/stock-watch notifications, without
trading, predictions, navigation or day controls. Predictions live in Stocks.
The profile avatar opens Portfolio. Bank keeps its exterior walk and interior
hotspots; its modeless service dialog leaves the screen options selectable.

`use-day-cycle.ts` is the only UI caller of End Day and Next Day. Clicking the
awake character's bed validates the saved prediction, commits End Day once and
animates the character into bed. REPORT is rendered as night with the character
asleep, including after reload; the backend day stays unchanged. Clicking Wake up
in that bed sends Next Day, switches to morning and wakes the character. The third
night ends in FINISHED; its wake action opens the final report without a fourth
day. Reports have no Next Day controls. Timers finish animation only and never
advance a game day. Night colors and a moonlit window are rendered from phase.

SceneStage scales the image and its hotspots in the same coordinate system and
uses a focal point for portrait cropping. No financial calculation depends on
scene state. Pixel fonts are local; a separate monospace number font keeps money,
rates and inputs legible. The HUD offers optional native browser fullscreen.
Its Restart control replaces the former Phone shortcut: it resets the server
session and local day-cycle state, then returns to the first morning in bed.

## Monthly Savings

The wallet exposes `monthlyInterestBps = 200` and
`savingsDepositLimitPence = 500000`. Each End Day credits rounded monthly interest
once on the full balance. The locked deposit transaction rejects a balance that
would exceed the deposit limit; withdrawals are unaffected. Interest may exceed
the limit and compounds on subsequent days. The migration preserves balances and
historical reports, updates the terms and increments existing session versions so
old in-flight writes become stale. Old idempotency records remain intact.

## Validation

`npm run typecheck`, `npm test` and `npm run build` cover both application layers.
HTTP integration tests use a fresh PostgreSQL database per suite, including
concurrent spends, duplicate requests, injected write failures and three-day
progression. See SETUP.md for local startup, migration and request examples.
