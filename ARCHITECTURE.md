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

Each new game stores a random market seed. At creation and each Next Day, choose
one random news template from the session's unused pool of 30 templates (10 good,
10 bad, 10 neutral). Save the complete publication in GameSession.dailyNews and
its template in newsHistory inside the same transaction as the day transition.
The API, predictions, bots and settlement all read that saved publication.
Opening the phone or reloading never rerolls it. Reset clears current publications
and starts day one with a fresh market seed, retaining the session's news history.
After all 30 templates are used, refill the pool while excluding the last three.
Existing sessions keep their seeded news for days already reached; Next Day
begins publishing random news without resetting their progress, excluding their
old seeded trio from the initial unused pool. Numeric
placeholders and prediction focus still use separate deterministic streams.
Company news affects that stock, technology news including Orion Cloud affects
NOVA, and general market news affects all three stocks. Neutral headlines retain
their small signed impacts. Briefing copy and report takeaways follow the category.

At settlement, lock the session and recheck the version/phase. Persist closing
prices, one monthly savings-interest credit and a historical report snapshot in
the same transaction. Unique constraints protect prices, reports, interest and
arbitrage attempts. Day 3 transitions directly to FINISHED; earlier days enter
REPORT and require Next Day to open the next BRIEFING.

## Bot portfolios and wealth ranking

The same 100 crowd identities have persistent cash, savings, holdings and loans.
All participants, including the player, start with 1,000,000 pence. The six
personalities vary their savings targets, trade sizes, arbitrage participation
and borrowing appetite. Bots use the existing financial engines and the same
limits as the player: 2% savings interest, a 500,000-pence deposit ceiling,
5% daily loan interest, repayment/overdue locks, and one funded arbitrage basket
per stall (three stalls per day). They decide from today's news and prior closes, before closing prices
are computed. Crowd votes express sentiment; actual bot trades also require
available cash or owned shares.

End Day stores all 100 settled portfolios inside the existing DailyReport JSON,
in the same transaction as prices, interest and the player's report. Public
reports omit these internal portfolios. Only the final day-three report exposes
the top-ten ranking snapshot after the session reaches FINISHED.
No database migration is needed. Sessions predating the feature reconstruct
missing bot snapshots from saved daily news, seed and price history, falling back
to the legacy seeded headlines for older days without saved publications.
Reset removes the snapshots with the reports and starts a new seeded scenario.

`GET /api/games/:gameId/leaderboard` requires the owning token and reads a
Repeatable Read snapshot. It ranks the player and bots by cash + savings + current
share value - full outstanding debt, returning ten leaders and the player's rank
even when outside the top ten. Equal wealth shares a competition rank, with
deterministic display order. The player's current actions update their wealth;
bot portfolios advance only at End Day. Rankings unlock only after all three days
have closed. Earlier API requests return LEADERBOARD_LOCKED; public reports and
saved-response replays omit early ranking snapshots, including those from older
sessions. The Ranking button and final report reveal the final standings only
after FINISHED; daily reports do not display rankings. Reset locks rankings again.

## Trading market

The arbitrage catalog contains 60 distinct products with 20 problems each using
two, three or four interchangeable package sizes. A dedicated seeded stream
draws three stalls per day without repeating any of the nine products within a
game. Prices have a separate stream and remain stable across reloads, browsing
and version changes. Some stalls have no profitable repacking route.

The player enters a separate market scene, walks through its entrance and browses
one wooden shelf at a time. Each product format has a posted buy/sell price and
independent buy/sell quantity fields. Previous/Next and three stall buttons retain
draft quantities while browsing. The decision screen does not compute or display
purchase totals, sale totals or profit/loss, and does not gate confirmation on
profitability. Resulting wealth and settled P&L remain in the normal game reports.
The items and confirmation bar share one scrolling area: Confirm trade follows
the full shelf, so it does not reserve height while browsing the goods.

`GET /api/games/:gameId/arbitrage` returns an ArbitrageMarketDTO containing the
three stalls and completion flags. `POST /api/games/:gameId/arbitrage/execute`
accepts a puzzleId and up to four order lines, each with itemId, buyQuantity and
sellQuantity. The server validates whole quantities, known unique items, equal
base units bought and sold, and sufficient cash for all purchases before sale
proceeds. It computes money with integer arithmetic and settles cash, the order
audit, session version and idempotency record atomically. Losing baskets are valid.

The arbitrage-market migration preserves old oil attempts, adds the order audit
and changes the attempt key to game/day/puzzle. Each stall allows one confirmed
basket and the session allows three total trades per day; prior oil attempts count
towards that limit. Daily reports sum all of the day's settled arbitrage results.
Bots use the same three stalls, conservation rule, prices, funding and attempt
limits, and may skip a stall without a profitable route. Reset removes attempts.

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
