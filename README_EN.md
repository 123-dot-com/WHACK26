# BULLISH! — A Day in the Life of a Finance Bro

> **Live the hype. Trade the news. Learn the consequences.**

**Project type:** Financial education browser game built for a hackathon.  
**Document:** Consolidated Product & Technical README based on team discussions, 6 November 2026.  
**Status:** Technology stack confirmed. Detailed MVP rules are proposed baselines pending final team approval.

## Table of Contents

1. Product vision & positioning
2. Gameplay, MVP & three-day demo
3. UI/UX & screen inventory
4. Market, Bank & Arbitrage
5. Technology stack & system architecture
6. Game State & PostgreSQL/Prisma data model
7. REST API contracts
8. Crowd Simulation & Market Engine
9. End Day & transaction consistency
10. Requirements, business rules & user stories
11. Testing & acceptance criteria
12. Repository structure, team plan & timeline
13. Deployment, risks & decision log

---

## 1. Product Vision & Positioning

**BULLISH!** is a life-simulation game combining financial management, a simulated stock market, and meaningful decision-making. Players take on the role of a chibi **finance bro**: waking up, reading news, predicting the market, BUYing/SELLing/HOLDing, watching 100 virtual investor agents react, checking profit and loss (P&L), saving money, and finding arbitrage opportunities.

**Product vision:** Make learning about investing and market behavior visual, playful, and entirely free from real-money risk.

**Product positioning:** A *financial decision-making life simulator*, not a gamified professional trading terminal or an investment-advice tool.

**Core promise:** Every game day presents a situation, a decision with consequences, and an explainable lesson.

**Four pillars:** (1) Fun First; (2) Learn by Doing; (3) Living Market (crowd agents); (4) Explainable Outcomes.

**Proposed audience:** Students, finance beginners, casual management/strategy players, and hackathon judges who must understand the product within minutes.

**Out of scope for MVP:** Real money/trades, real-time stock quotes, investment forecasting, multiplayer, LLM-driven agents, 3D/open-world gameplay, complex user-account authentication, microservices, and WebSockets.

**Confirmed priorities:** Balance **fun gameplay and financial education**; build with a **3–4-person team**.

## 2. Gameplay, MVP & Three-Day Demo

### Gameplay Loop

```text
Home / Bedroom (click bed to wake)
       ↓
Phone: stock-news messages (news only)
       ↓
Persistent screen options — activities in any order
    ├── Stocks: Prediction + BUY / SELL / HOLD
    ├── Bank: DEPOSIT / WITHDRAW
    └── Arbitrage: puzzle, Execute
       ↓
Click bed to sleep → End Day [BACKEND]
    ├── Crowd Simulation (100 agents)
    ├── Market Engine (update prices)
    ├── Savings interest (once per day)
    └── Daily Report (P&L, explanation)
       ↓
Night / asleep (same day) → click Wake up → Next Day / Final Report
```

**Game phases:** `BRIEFING → TRADING → REPORT → BRIEFING` (next day), or `FINISHED` after Day 3.

- A prediction for the **focus stock** is required **before End Day**, but not necessarily before trading.
- HOLD / skipping trades is allowed. Running out of money does not end the demo early.
- Each day can end only once; the REPORT phase blocks trading, Bank, and Arbitrage actions.
- Cash, savings, holdings, and price history persist across days.
- Reset reproduces the seeded demo scenario.
- **Current screen flow:** the phone shows stock news/messages only. Stocks,
  Arbitrage and Bank are persistent screen options; predictions are made in Stocks.
- **Bed controls the clock:** click the bed to sleep and settle End Day, stay on
  that day at night, then click Wake up to send Next Day. Report screens never
  advance the day. Night is restored from REPORT/FINISHED after reload.

### MVP Baseline

| Item | Proposed value |
|---|---|
| Game length | 3 days |
| Demo duration | 3–5 minutes |
| Starting funds | £10,000 in-game money |
| Stocks | 3 fictional tickers: NOVA, GREEN, FINX |
| News | 1 major story per day; optional secondary stories |
| Agents | 100 agents across 6 behavior groups |
| Bank | Current Account + 1 Savings Account |
| Arbitrage | 1 puzzle per day, 1 attempt per day |
| Outcomes | Daily & Final Report, Reset |
| Scenarios | Fixed seed; prices still calculated by the simulation |

### Proposed Demo Narrative

| Day | Event | Learning point |
|---|---|---|
| 1 | Nova AI announces a major AI partnership (`impact +0.8`) | Good news and buying pressure |
| 2 | Investors rush into AI (`impact +0.2`) | FOMO, momentum, expectations |
| 3 | Nova AI cuts its revenue forecast (`impact -0.9`) | Market reversals and risk |

News impact is an input in `[-1, 1]`, **not a predetermined percentage price move**. Results depend on agent decisions, momentum, and noise.

### Scope

- **P0:** Home, Briefing, Prediction, Market BUY/SELL/HOLD, Portfolio, Crowd/Market, End Day, Daily Report, Next Day, Reset, database persistence, **Bank P0-lite**, and **Arbitrage P0-lite**.
- **P1:** Stock chart, visual reactions by agent group, trade/bank history UI, chibi visual polish.
- **P2:** Multiple Savings products with lock periods, additional arbitrage levels/items, avatar customization, advanced animation.
- **Scope freeze:** Do not start P1/P2 before one complete end-to-end loop works through the API and database.

## 3. UI/UX & Screen Inventory

**Proposed visual style:** A cozy chibi / pixel-inspired finance simulator: financial information should be clear without feeling dry. Free-roaming movement is unnecessary; use tabs/navigation between areas.

| Screen | Core content |
|---|---|
| **Home / Bedroom** | Chibi finance bro, Day, Cash, Savings, Net Worth, navigation |
| **Morning Briefing** | Fictional news, event impact, focus stock, Prediction |
| **Market** | 3 stocks, prices, simple chart, sentiment, BUY/SELL |
| **Portfolio** | Holdings, Current Cash, Net Worth, P&L, history (P1) |
| **Bank** | Current/Savings cards, interest rate, Deposit/Withdraw, interest estimate |
| **Arbitrage Room** | Oil & Bundle prices, blue Buy / red Sell, quantity +/- controls, trade route/profit |
| **Daily Report** | Price moves, crowd, prediction accuracy, Market P&L, Interest, Arbitrage profit |
| **Final Report** | Final Wealth, 3 predictions, risk context, takeaway, Reset |

**UX rules:** Always show feedback for insufficient funds, invalid quantities, pending requests, stale game state (409), already-completed arbitrage, and invalid/expired sessions. Use explicit BUY/SELL and +/- labels instead of relying on color alone.

**Arbitrage UI reference from the supplied image:** Two side-by-side product cards: Oil and Sack of Oil (bundle ×3), blue Buy / red Sell prices, +/- quantity controls, and a quickly scannable layout. Keep it simple.

## 4. Market, Bank & Arbitrage

### 4.1 Market

- 3 fictional stocks; server calculates and stores all prices.
- Players buy/sell at the **current authoritative price before End Day**; no short selling or margin.
- Successful trades immediately change cash/holdings, but do not instantly change Net Worth (no trading fees in MVP).
- End Day runs the Crowd/Market engines, updating prices, P&L, and explanations.
- Focus-stock predictions are evaluated as follows: `return > +1% => BULLISH`; `return < -1% => BEARISH`; otherwise `NEUTRAL`.
- Market is the **core mechanic**; Bank and Arbitrage add decisions about risk, liquidity, and opportunity.

### 4.2 Bank

Two accounts:
- **Current Account:** `cashPence`, used for stock trades and Arbitrage.
- **Savings Account:** `savingsPence`, earning interest at End Day.

**Proposed MVP rules:**
- Starting Current balance £10,000; Savings £0.
- One Savings product: **2% per month**, `monthlyInterestBps = 200`, as requested for the game.
- Deposits may bring the current Savings balance up to **£5,000** (`savingsDepositLimitPence = 500000`). Interest may take the balance above this limit; further deposits require room below it.
- **1 game day = 1 month**, so players can see interest during the short demo.
- Unlimited Deposit/Withdraw actions before End Day; no fees or lock period.
- Compound interest is calculated on the **Savings balance at the moment the day closes**.
- Formula: `interestPence = round(savingsPence * monthlyInterestBps / 10_000)`.
- Example: £2,000 in Savings → `£40.00` for one game day → new Savings balance `£2,040.00`.
- Moving money between Current and Savings does **not** change total Net Worth.
- Interest must be credited **exactly once per game day**, persisted as a transaction.
- Optional future products: Easy Access 2%, Smart Saver 4%, Premium Saver 6% with caps/lock periods (fictional game rates).

### 4.3 Arbitrage

**Simple price-difference puzzle, following the provided Oil / Sack of Oil image; no real exchange or inventory system.**

| Product | Buy price | Sell price |
|---|---:|---:|
| 1 Oil | £25 | £24 |
| 1 Sack of Oil = 3 Oil | £69 | £68 |

Possible routes:
- **Buy 1 Sack (£69) → Sell 3 individual Oil (£72): +£3 profit.**
- **Buy 3 individual Oil (£75) → Sell 1 Sack (£68): −£7 loss.**

```text
cost = route == BUY_BUNDLE_SELL_UNITS
  ? bundleBuyPence * quantity
  : unitBuyPence * bundleSize * quantity

revenue = route == BUY_BUNDLE_SELL_UNITS
  ? unitSellPence * bundleSize * quantity
  : bundleSellPence * quantity

profitPence = revenue - cost
```

**Rules:**
- 1 puzzle/attempt per day in the MVP; no unlimited money farming.
- Preview cost, revenue, and profit/loss before confirmation.
- Validate the full **gross purchase cost** against Current Cash, not merely the final net loss.
- The backend derives item prices, validates the selected route and quantity, and settles profit/loss in Current Cash.
- Buying and selling happen instantly; no inventory intermediate state is required.
- Record the attempt in PostgreSQL with a unique `(gameId, day)` constraint.
- Show Arbitrage profit/loss separately in the Daily Report.
- Later: more commodities, difficulty levels, fees, and quantity caps.

---

## 5. Technology Stack & System Architecture

### User-Confirmed Stack

| Layer | Technology |
|---|---|
| Frontend | **React + Vite + TypeScript** |
| Backend | **Node.js + Express + TypeScript** |
| Communication | **REST API + JSON** |
| Database | **PostgreSQL** |
| ORM | **Prisma** |
| Architecture | **Modular Monolith**, backend-authoritative game state |

**Additional recommendations:** A monorepo; Zod for request validation and shared types; Vitest for tests; Railway for backend/PostgreSQL and Vercel or Railway for frontend. Prisma v7 was *suggested* to keep earlier examples consistent, but **the user has not confirmed a Prisma major version**. Verify client APIs, adapters, and migration commands against the version actually installed.

### Architecture

```text
┌──────────────────────────────────────────────────┐
│ React / Vite / TypeScript                        │
│ Home · News · Market · Portfolio · Bank · Arb    │
└───────────────────┬──────────────────────────────┘
                    │ HTTPS / REST JSON
                    ▼
┌──────────────────────────────────────────────────┐
│ Node.js / Express / TypeScript                   │
│ Routes → Validation → Application Services      │
│                                                  │
│  Game Service   Trading Engine    Bank Engine    │
│  Crowd Engine  Market Engine      Arbitrage      │
│  Report Engine                                  │
└───────────────────┬──────────────────────────────┘
                    │ Prisma / DB transactions
                    ▼
┌──────────────────────────────────────────────────┐
│ PostgreSQL                                       │
│ Sessions · Wallets · Holdings · Prices · Trades  │
│ Predictions · BankTx · ArbAttempts · Reports     │
└──────────────────────────────────────────────────┘
```

**Responsibility boundaries:**
- React sends **intent**. It does not calculate or independently update cash, profit, or stock prices.
- Express routes parse requests, check session authorization, and validate inputs.
- Application services orchestrate phases and database transactions.
- Engines are **pure functions**: no direct database I/O, no dependency on React.
- Repositories/Prisma persist state.
- PostgreSQL is the single source of truth. Do not treat localStorage as authoritative game state (it may store a session token, subject to security decisions).
- No need for Socket.IO, microservices, Redis, or a message broker in the MVP.

## 6. Game State & PostgreSQL/Prisma Data Model

### Runtime Game State DTO (Assembled by the Backend)

```ts
type StockId = "NOVA" | "GREEN" | "FINX";
type GamePhase = "BRIEFING" | "TRADING" | "REPORT" | "FINISHED";
type PredictionDirection = "BULLISH" | "NEUTRAL" | "BEARISH";

interface GameStateDTO {
  gameId: string;
  day: number;            // 1..3
  phase: GamePhase;
  version: number;        // optimistic concurrency
  wallet: {
    cashPence: number;
    savingsPence: number;
    monthlyInterestBps: number;  // 200 = 2% per month
    savingsDepositLimitPence: number;  // 500000 = £5,000
  };
  stocks: Array<{
    id: StockId;
    name: string;
    pricePence: number;
    previousClosePence: number;
    quantityHeld: number;
  }>;
  prediction: {
    stockId: StockId;
    direction: PredictionDirection;
  } | null;
  arbitrage: { completedToday: boolean };
  netWorthPence: number;
}
```

**Financial invariants:**

```text
NetWorthPence = cashPence + savingsPence
              + Σ(quantityHeld[stock] × currentPricePence[stock])
cashPence >= 0; savingsPence >= 0
quantityHeld: integer >= 0
pricePence: integer >= 1
```

Avoid floating-point monetary balances: money is stored as **integer pence**, while interest rates are stored in **basis points**. `DailyReport` stores a historical snapshot; runtime Net Worth is normally derived from wallet + holdings + current prices.

### Proposed Stock Seed Data

| Symbol | Company | Sector | Initial price | Volatility |
|---|---|---|---:|---:|
| NOVA | Nova AI | TECH | £100.00 | 1.2 |
| GREEN | GreenGrid Energy | ENERGY | £50.00 | 0.8 |
| FINX | FinX Bank | FINANCE | £75.00 | 1.0 |

Every game starts with **day-0** stock prices; closing Day N creates a `StockPrice` entry for `(gameId, stockId, N)`.

### Database Entities

| Model | Key fields | Purpose |
|---|---|---|
| `GameSession` | `id`, `day`, `phase`, `seed`, `version`, `lastSimulatedDay` | Game progression |
| `Wallet` | `gameId`, `cashPence`, `savingsPence`, `monthlyInterestBps`, `savingsDepositLimitPence` | Accounts |
| `Stock` | `id`, `name`, `sector`, `volatility`, `initialPricePence` | Static catalog |
| `Holding` | `gameId`, `stockId`, `quantity` | Shares held |
| `StockPrice` | `gameId`, `stockId`, `day`, `pricePence` | Per-game price history |
| `Trade` | `gameId`, `day`, `stockId`, `side`, `quantity`, `pricePence`, `totalPence` | Trade audit trail |
| `BankTransaction` | `gameId`, `day`, `operation`, `amountPence` | Banking audit trail |
| `Prediction` | `gameId`, `day`, `stockId`, `direction` | Daily prediction |
| `ArbitrageAttempt` | `gameId`, `day`, `puzzleId`, `route`, `profitPence` | Puzzle outcome |
| `DailyReport` | `gameId`, `day`, P&L components, `netWorthPence`, `details` JSON | Historical report |
| `IdempotencyRecord` | `gameId`, `key`, `requestHash`, `responseBody`, `statusCode` | Safe retries |
| `GameAccess` (optional) | `gameId`, `tokenHash` | Session authorization |

**Keys and uniqueness constraints:**

```text
Holding:       (gameId, stockId) UNIQUE/COMPOSITE PRIMARY KEY
StockPrice:    (gameId, stockId, day) UNIQUE
Prediction:    (gameId, day) UNIQUE
ArbAttempt:    (gameId, day) UNIQUE
DailyReport:   (gameId, day) UNIQUE
Idempotency:   (gameId, key) UNIQUE
Interest:      one interest credit per (gameId, day)
```

Add database-level `CHECK` constraints (via SQL migrations) for non-negative balances, positive prices, valid quantities, and valid days. `DailyReport.details` can hold crowd-by-group statistics, attribution, and news explanations; there is no need to persist 100 agent rows per game.

**Version note:** This is a **schema contract**, not a Prisma migration that has been run. Implement the actual `schema.prisma` and Prisma client code against the major version chosen by the team.

### Example Initial State

```json
{
  "gameId": "demo-001",
  "day": 1,
  "phase": "BRIEFING",
  "version": 0,
  "seed": 2026,
  "lastSimulatedDay": 0,
  "wallet": {
    "cashPence": 1000000,
    "savingsPence": 0,
    "monthlyInterestBps": 200,
    "savingsDepositLimitPence": 500000
  },
  "holdings": { "NOVA": 0, "GREEN": 0, "FINX": 0 }
}
```

## 7. REST API Contracts

### Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/games` | Create a new game/session |
| GET | `/api/games/:gameId` | Retrieve current state |
| GET | `/api/games/:gameId/news` | Get the daily briefing |
| POST | `/api/games/:gameId/open-market` | BRIEFING → TRADING |
| POST | `/api/games/:gameId/prediction` | Save prediction |
| POST | `/api/games/:gameId/trades` | BUY/SELL |
| POST | `/api/games/:gameId/bank/deposit` | Deposit funds |
| POST | `/api/games/:gameId/bank/withdraw` | Withdraw funds |
| GET | `/api/games/:gameId/arbitrage` | Fetch today's puzzle |
| POST | `/api/games/:gameId/arbitrage/execute` | Execute arbitrage |
| POST | `/api/games/:gameId/end-day` | Simulate, settle, report |
| POST | `/api/games/:gameId/next-day` | Advance day |
| GET | `/api/games/:gameId/reports/:day` | Retrieve a report |
| POST | `/api/games/:gameId/reset` | Reset the game |

**Success response envelope:**

```json
{ "success": true, "data": {}, "stateVersion": 5 }
```

**Error response envelope:**

```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_CASH",
    "message": "Not enough money to complete this action."
  }
}
```

### Request Versioning & Safe Retries

- Mutating endpoints receive `expectedVersion`. The backend checks `GameSession.version` and increments it on successful commit.
- Mutating financial requests and End Day require an **`Idempotency-Key`**. The backend must persist the key, request hash, and response **in PostgreSQL**; sending a header alone is insufficient.
- Same key + same payload → same recorded result, no re-execution. Same key + different payload → reject.
- Every game session requires a sufficiently random **access token**. A `gameId` alone does not authorize updates.
- HTTP conventions: `200/201` success, `400` invalid request, `401/403` access token errors, `404` not found, `409` stale/duplicate/phase conflict, `422` business-rule violation, `500` unhandled server error.

### Example — Trade

```http
POST /api/games/demo-001/trades
Authorization: Bearer <game-session-token>
Idempotency-Key: trade-001
Content-Type: application/json
```

```json
{
  "stockId": "NOVA",
  "side": "BUY",
  "quantity": 20,
  "expectedVersion": 4
}
```

Assuming NOVA costs £100 and the player has £10,000 cash, the resulting cash is £8,000, the NOVA holding is 20, and a new Trade record is created. The backend determines the **authoritative price**; it must not trust a client-submitted price.

### Example — Deposit

```json
{ "amountPence": 50000, "expectedVersion": 5 }
```

The backend transfers £500 atomically between Current and Savings.

### Example — Arbitrage

```json
{
  "puzzleId": "OIL-D1",
  "route": "BUY_BUNDLE_SELL_UNITS",
  "quantity": 1,
  "expectedVersion": 6
}
```

```json
{
  "success": true,
  "data": {
    "costPence": 6900,
    "revenuePence": 7200,
    "profitPence": 300,
    "completedToday": true
  },
  "stateVersion": 7
}
```

### Standard Error Codes

`INVALID_PHASE`, `INVALID_QUANTITY`, `INVALID_STOCK`, `INSUFFICIENT_CASH`, `INSUFFICIENT_HOLDINGS`, `PREDICTION_REQUIRED`, `DAY_ALREADY_SIMULATED`, `ARBITRAGE_ALREADY_COMPLETED`, `VERSION_CONFLICT`, `INVALID_SESSION`.

## 8. Crowd Simulation & Market Engine

### Crowd Population — 100 Virtual Investors

| Agent group | Count | Behavior |
|---|---:|---|
| Optimists | 20 | More sensitive to positive news |
| Pessimists | 20 | More sensitive to bad news |
| FOMO traders | 20 | Chase positive price momentum |
| Panic sellers | 15 | Sell on negative momentum |
| Long-term investors | 15 | Higher trading threshold / less active |
| Analysts | 10 | Evaluate news and price signals |

**MVP simplification:** Each agent casts one BUY/SELL/HOLD vote **per stock per day**. Virtual agents do not need individual cash balances or portfolios.

```ts
type AgentAction = "BUY" | "SELL" | "HOLD";

interface InvestorAgent {
  id: number;
  type: "OPTIMIST" | "PESSIMIST" | "FOMO" |
        "PANIC" | "LONG_TERM" | "ANALYST";
  newsSensitivity: number;
  momentumSensitivity: number;
  riskBias: number;
  actionThreshold: number;
}

interface CrowdContext {
  day: number;
  stockId: StockId;
  newsSignal: number;   // [-1,1]
  momentum: number;     // [-1,1]
  seed: number;
}

interface CrowdResult {
  stockId: StockId;
  buyCount: number;
  sellCount: number;
  holdCount: number;
  pressure: number;
  byGroup: Record<string, {
    buy: number; sell: number; hold: number
  }>;
}
```

### Agent Decision Logic

```text
score_i =
   adjustedNewsWeight_i * newsSignal
 + adjustedMomentumWeight_i * momentum
 + riskBias_i
 + deterministicNoise_i

if score_i > threshold_i: BUY
else if score_i < -threshold_i: SELL
else: HOLD
```

**Starting tuning parameters (proposed, not yet calibrated):**

| Type | News weight | Momentum weight | Bias |
|---|---:|---:|---:|
| Optimist | 0.90 | 0.20 | +0.15 |
| Pessimist | 1.00 | 0.15 | -0.20 |
| FOMO | 0.30 | 1.20 | +0.05 |
| Panic | 0.60 | 1.00 | -0.10 |
| Long-term | 0.35 | 0.15 | 0 |
| Analyst | 1.10 | 0.30 | 0 |

FOMO reacts more strongly to **rising** momentum; Panic sellers react more to **falling** momentum. Optimists emphasize positive news, Pessimists negative news. Long-term agents use higher thresholds (`~0.45–0.60`) versus `~0.15–0.30` for most other groups.

### Crowd Aggregation

```text
buyCount + sellCount + holdCount = 100
crowdPressure = (buyCount - sellCount) / 100
```

Example: 70 BUY + 20 SELL + 10 HOLD → `pressure = +0.5`.

### Market Price Function

**News → Agent decisions → Crowd pressure → Price.** Do not add NewsImpact a second time: the news signal is already reflected in agent behavior.

```text
rawReturn = 0.08 * volatility * crowdPressure + marketNoise
dailyReturn = clamp(rawReturn, -0.10, +0.10)
nextPricePence = round(currentPricePence * (1 + dailyReturn))
```

- Volatility: NOVA=1.2, GREEN=0.8, FINX=1.0.
- Market noise in `[−0.005, +0.005]`, generated deterministically.
- Proposed normalized momentum: `clamp(previousReturn / 0.10, -1, 1)`; Day 1 momentum is 0.
- Store one closing price per stock per day.
- Daily return is capped at ±10%; a precise rounding/tick-size rule remains necessary for extremely low-priced stocks.

**Worked example:** NOVA £100; crowdPressure 0.5; volatility 1.2; noise 0 → `0.08 × 1.2 × 0.5 = +4.8%` → £104.80. Holding 20 shares bought at £100 produces **+£96 Market P&L**.

### Determinism

Do not use `Math.random()` directly inside the simulation. Use a seeded PRNG (e.g., Mulberry32). Derive seeds from the tuple **(gameSeed, day, stockId, streamName)**, and use separate streams for `agentNoise` and `marketNoise`. Changing the order in which stocks are processed must not change their results.

### Price Attribution

`MarketOutput` includes `previousPrice`, `nextPrice`, `returnPct`, buy/sell/hold counts, `crowdPressure`, `crowdContributionPct`, `noiseContributionPct`, and explanation data.

If the return is **clamped to ±10%** or **rounded** to a whole pence, pre-cap contributions will not necessarily sum to the actual return. Reports must identify these adjustments rather than incorrectly attributing all price movement to the crowd.

## 9. End Day & Transaction Consistency

### End Day Orchestration

```text
1. Check token, phase TRADING, day, version, prediction, not simulated.
2. Read consistent snapshot: cash, savings, holdings, stocks, news, seed.
3. Run Crowd Engine independently for each stock.
4. Run Market Engine for all three stocks.
5. Calculate market P&L and interest.
6. Build DailyReport using actual engine results.
7. In an atomic PostgreSQL transaction:
   - re-check version, phase and day
   - write next StockPrice rows
   - update Savings + insert INTEREST BankTransaction
   - insert DailyReport
   - set lastSimulatedDay and phase REPORT
   - increment session version
   - record idempotency result
8. Return new GameState/Report.
```

**Concurrency design:**
- Run pure simulations before opening a database transaction, provided the input snapshot is consistent.
- Within the transaction, re-check `version`, `phase`, and `day` at commit time.
- Use a row lock or conditional version update with an appropriate isolation strategy; at most one End Day should succeed.
- Unique report, stock price, interest, and arbitrage constraints add defense in depth.
- A retry with the same idempotency key must return the stored result, not credit money twice.
- Do not optimistically modify money values in React before confirmation from the server (show pending state instead).

**Trading:** Update cash + holdings + Trade in one database transaction.  
**Bank:** Update Current + Savings + BankTransaction in one database transaction.  
**Arbitrage:** Calculate on server + verify gross cost + update cash + insert the unique attempt in one transaction.

### Daily Report

```ts
interface DailyReportDTO {
  day: number;
  prediction: {
    stockId: StockId;
    chosen: PredictionDirection;
    actual: PredictionDirection;
    correct: boolean;
  };
  marketResults: Array<{
    stockId: StockId;
    previousPricePence: number;
    nextPricePence: number;
    returnPct: number;
    buyCount: number;
    sellCount: number;
    holdCount: number;
    crowdPressure: number;
    explanation: string;
  }>;
  marketPnlPence: number;
  interestPence: number;
  arbitragePnlPence: number;
  netWorthPence: number;
}
```

`marketPnlPence = Σ(quantityHeldAtClose × (nextPrice − beforePrice))`.

### Consistent Financial Example

Assume the player starts with £10,000:
1. BUY 20 NOVA × £100 = £2,000 → Current £8,000.
2. DEPOSIT £2,000 → Current £6,000; Savings £2,000.
3. Make £3 from Arbitrage → Current £6,003.
4. NOVA rises to £104.80 → holdings are worth £2,096.
5. Savings earns £40.00 interest → Savings £2,040.00.

**End-of-day Net Worth = £6,003 + £2,040.00 + £2,096 = £10,139.00.**
**Breakdown:** Market `+£96` + Interest `+£40.00` + Arbitrage `+£3` = `+£139.00`.

**Final evaluation:** Final Wealth, correct predictions out of 3, exposure/risk context, and a learning takeaway. Low risk must not automatically be treated as always better.

## 10. Requirements, Business Rules & User Stories

### Functional Requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-01 | Start New Game with £10,000 on Day 1 | P0 |
| FR-02 | Show the correct Morning Briefing for each day | P0 |
| FR-03 | Display 3 fictional stocks and current prices | P0 |
| FR-04 | Predict focus-stock direction: Bullish/Neutral/Bearish | P0 |
| FR-05 | BUY using Current Cash; validate available funds | P0 |
| FR-06 | SELL up to the quantity actually held | P0 |
| FR-07 | Allow HOLD / skipping trades | P0 |
| FR-08 | Simulate 100 investor agents in 6 groups | P0 |
| FR-09 | Update prices once per End Day | P0 |
| FR-10 | Show Daily Report including Market P&L and explanation | P0 |
| FR-11 | Preserve Cash, Savings, and Holdings across days | P0 |
| FR-12 | Set phase FINISHED after Day 3 | P0 |
| FR-13 | Reset the entire game state | P0 |
| FR-14 | Bank Deposit/Withdraw/Interest | P0-lite |
| FR-15 | Arbitrage puzzle and profit/loss settlement | P0-lite |
| FR-16 | PostgreSQL persistence and REST backend | P0 |
| FR-17 | Stock price chart | P1 |
| FR-18 | Visual reactions by agent group | P1 |
| FR-19 | Transaction history UI | P1 |
| FR-20 | Multiple savings products/arbitrage levels | P2 |

### Business Rules

| ID | Rule |
|---|---|
| BR-01 | Only fictional money/stocks; no real investment advice |
| BR-02 | Current Cash, Savings, and Holdings must never be negative |
| BR-03 | Trading quantity must be a positive integer |
| BR-04 | No short selling or margin |
| BR-05 | BUY/SELL at the authoritative price before End Day |
| BR-06 | No trading fees, taxes, or dividends in MVP |
| BR-07 | At most one successful End Day per game/day |
| BR-08 | REPORT/FINISHED blocks financial transactions |
| BR-09 | Daily price movement capped at approximately ±10% (tick/floor rule pending) |
| BR-10 | Reset reproduces the seeded scenario |
| BR-11 | Net Worth includes Savings |
| BR-12 | Credit Savings interest once per day |
| BR-13 | Allow at most one Arbitrage attempt per day |
| BR-14 | Backend is authoritative; client submits intent |
| BR-15 | Mutating APIs use version checks and DB transactions |
| BR-16 | Financial API requests require persisted idempotency keys |
| BR-17 | Prediction required before End Day, not before BUY/SELL |
| BR-18 | Trade/Bank actions permitted only during TRADING phase |
| BR-19 | FINISHED phase offers Final Report and Reset |
| BR-20 | Money uses integer pence; interest rate uses basis points |

### User Stories & Acceptance Criteria

**US-01 — News and Prediction:** As a player, I want to read market news and predict the stock's direction so I can test my understanding.

- Given Day N, when I open Briefing, I receive that day's news and focus stock.
- I can select Bullish/Neutral/Bearish, and my prediction is stored on the server.
- I cannot modify a prediction after the day has closed.

**US-02 — Trade:** As a player, I want to BUY/SELL/HOLD so my decisions affect my assets.

- A valid BUY reduces Current Cash and increases holdings at the server-authoritative price.
- BUY over available cash and SELL over holdings are rejected without changing state.
- HOLD/no trade leaves cash/holdings unchanged and still allows End Day if a prediction exists.

**US-03 — Crowd/Market:** As a player, I want to see crowd reactions and understand why prices moved.

- Each stock has 100 agent decisions; BUY+SELL+HOLD counts sum to 100.
- Same seed and snapshot produce the same output.
- Market attribution matches the actual simulation data.

**US-04 — Learn:** As a player, I want the Daily Report to compare my prediction with the actual market outcome so I can learn.

- Report includes prior/new prices, return percentage, P&L, prediction, crowd pressure, and an explanation.
- Bank interest and Arbitrage profit are displayed separately.
- After the report, I can advance to the next day or finish.

**US-05 — Savings:** As a player, I want to transfer money into Savings and earn interest.

- A valid Deposit/Withdraw does not immediately change Net Worth.
- I cannot transfer more than the available balance.
- Savings interest is credited only once per day.

**US-06 — Arbitrage:** As a player, I want to spot price differences between individual items and bundles.

- I can preview the purchase cost and sale revenue.
- The server calculates the settlement and validates enough cash for the gross purchase cost.
- Each day permits one execution, with profit/loss added to or subtracted from Current Cash.

## 11. Testing & Acceptance Criteria

### Unit & Integration Test Matrix

| Test | Scenario | Expected |
|---|---|---|
| DB-01 | Create game | Session + Wallet + 3 day-0 stock prices |
| DB-02 | Restart server / reload | Progress persisted in PostgreSQL |
| TR-01 | BUY 20 NOVA × £100 with £10,000 | Cash £8,000; NOVA = 20 |
| TR-02 | BUY 101 NOVA × £100 | `INSUFFICIENT_CASH`; rollback |
| TR-03 | SELL 5 out of 20 | Holdings fall to 15; correct cash increase |
| TR-04 | SELL 21 out of 20 | `INSUFFICIENT_HOLDINGS`; rollback |
| TR-05 | Quantity is zero, negative, or fractional | `INVALID_QUANTITY` |
| TR-06 | Trade during REPORT | `INVALID_PHASE` |
| BK-01 | Deposit £500 | Current −£500; Savings +£500 |
| BK-02 | Withdraw more than Savings | Reject without update |
| BK-03 | £2,000 Savings, 2% monthly, End Day | +£40.00 interest |
| BK-04 | Retry End Day | No second interest credit |
| AR-01 | Oil Bundle £69; sell units for £72 | Profit +£3 |
| AR-02 | Buy individual units for £75; sell bundle for £68 | Loss −£7 |
| AR-03 | Attempt arbitrage twice in one day | No duplicate reward or loss |
| AR-04 | Current Cash below gross purchase cost | Reject |
| CR-01 | 100 agents | Exactly 100 decisions |
| CR-02 | 70 BUY, 20 SELL, 10 HOLD | Pressure = 0.5 |
| CR-03 | Same seed/state | Identical crowd result |
| CR-04 | Change stock processing order | Per-stock results unchanged |
| MK-01 | £100, pressure 0.5, volatility 1.2, noise 0 | £104.80 |
| MK-02 | £100, pressure −0.5, volatility 1, noise 0 | £96.00 |
| MK-03 | Pressure 0, noise 0 | Price unchanged |
| MK-04 | Requested return greater than +10% | Price cap applies |
| MK-05 | Requested return less than −10% | Price cap applies |
| GM-01 | End Day with missing prediction | Reject |
| GM-02 | End Day twice | Only one successful report |
| GM-03 | Two concurrent End Day requests | Only one DB commit |
| GM-04 | Complete Day 3 | FINISHED, exactly 3 Daily Reports |
| GM-05 | Reset game | Initial balances and prices |
| API-01 | Stale expectedVersion | HTTP 409; state unchanged |
| API-02 | Retry identical idempotency key and payload | Same response, no duplicate |
| API-03 | Same key, different payload | Reject |
| API-04 | Missing/invalid access token | HTTP 401/403 |
| E2E-01 | Full playthrough | 3 game days in ~3–5 minutes |

**Testing strategy:** Use Vitest for pure engines; HTTP integration tests against a real PostgreSQL test database for transactions, unique constraints, and race conditions; manual or automated E2E tests for the gameplay.

### Definition of Done

- [ ] Frontend, Express, and PostgreSQL run together
- [ ] Create Game, Read State, and enforce session-token permissions
- [ ] Briefing, Prediction, BUY/SELL/HOLD work
- [ ] Crowd/Market simulation is deterministic
- [ ] Bank Deposit/Withdraw/Interest work
- [ ] Arbitrage settlement can occur only once per day
- [ ] End Day is atomic and safe to retry
- [ ] Daily/Final Reports calculate money correctly
- [ ] Three-day progression and Reset work
- [ ] Concurrency, idempotency, and balance tests pass
- [ ] Demo deployed and full 3–5-minute playthrough works

**Nonfunctional targets (proposed, not measured):** Simulation in approximately under one second on demo hardware; low-friction UX; clear error messages; persistent state; reproducible seeded demo.

## 12. Repository Structure, Team Plan & Timeline

### Proposed Monorepo

```text
bullish/
├── apps/
│   ├── web/
│   │   └── src/
│   │       ├── pages/
│   │       │   ├── Home.tsx
│   │       │   ├── Briefing.tsx
│   │       │   ├── Market.tsx
│   │       │   ├── Portfolio.tsx
│   │       │   ├── Bank.tsx
│   │       │   ├── Arbitrage.tsx
│   │       │   ├── DailyReport.tsx
│   │       │   └── FinalReport.tsx
│   │       ├── components/
│   │       ├── api/
│   │       └── hooks/
│   └── server/
│       ├── prisma/
│       │   ├── schema.prisma   # if compatible with pinned Prisma
│       │   ├── migrations/
│       │   └── seed.ts
│       └── src/
│           ├── routes/
│           ├── controllers/
│           ├── services/
│           │   ├── game.service.ts
│           │   ├── trading.service.ts
│           │   ├── bank.service.ts
│           │   └── arbitrage.service.ts
│           ├── engines/
│           │   ├── crowd.engine.ts
│           │   ├── market.engine.ts
│           │   ├── bank.engine.ts
│           │   ├── arbitrage.engine.ts
│           │   └── report.engine.ts
│           ├── repositories/
│           ├── middleware/
│           ├── data/
│           ├── tests/
│           └── app.ts
├── packages/
│   └── shared/
│       ├── types/
│       ├── schemas/
│       └── contracts/
└── package.json
```

**Recommended assignment for four members:**

| Member | Responsibilities |
|---|---|
| 1 | Frontend Home, News, Market, Daily/Final Report, chibi UI |
| 2 | Frontend Bank, Arbitrage, Portfolio, API integration |
| 3 | Backend Trading, Crowd, Market, deterministic tests |
| 4 | Backend Prisma, REST, Game State, Bank/Arbitrage services, orchestration, integration |

**For a three-person team:** Member 2 takes on additional lightweight integration; Member 3 and the database owner share End Day integration. Prioritize working logic and minimize visual polish.

**One-day hackathon timeline:**

| Time | Deliverable |
|---|---|
| 09:00–09:30 | Repository, contracts, schema, DB, seed data |
| 09:30–11:30 | Parallel UI, Trading, Crowd/Market, Bank/Arbitrage API development |
| 11:30–12:30 | First integrated Briefing → Trade → End Day → Report |
| 12:30–14:00 | Three-day flow, Bank/Arbitrage, Reset |
| 14:00–15:00 | Database transaction QA, UI polish, tests |
| 15:00–16:15 | Deploy, demo rehearsal, fallback preparation |

**Critical checkpoint:** If the core loop is not running end-to-end by 12:30, stop P1/P2 work and focus on integration.

## 13. Deployment, Risks & Decision Log

### Deployment & Security

- Frontend: Vercel or Railway.
- Express Backend + PostgreSQL: Railway is a practical hackathon option: https://railway.com?referralCode=RzvnD5
- Run migrations before serving, seed scenarios, and configure `DATABASE_URL`, `PORT`, `CORS_ORIGIN`, and session secrets.
- Never commit secrets. `.env.example` should contain placeholders only.
- Use a session access token checked by the backend (optionally store only its hash); knowing `gameId` must not allow someone to modify a session.
- HTTPS, request validation, restricted CORS origins, payload-size limits, and centralized error handling.
- PostgreSQL is the durable store; server RAM must not be the authoritative state.

### Key Risks

| Risk | Mitigation |
|---|---|
| Too many screens/features | Build one complete core loop first; keep Bank/Arbitrage P0-lite |
| Random-looking prices and vague explanations | Seeded crowd simulation and accurate attribution |
| Beautiful UI but nonfunctional gameplay | First vertical slice before visual polish |
| Double End Day, races, duplicate interest | Version checks, unique constraints, DB transactions, idempotency |
| Database/Prisma setup takes too long | Agree on shared contracts and migrations early |
| Life simulation feels decorative | Use Bedroom/character to frame days; do not build a walking engine |
| Low prices cause rounding beyond cap | Decide on a price floor/tick rule; add edge-case tests |
| Demo misses the hackathon rubric | Review the official problem statement and adapt the emphasis |

### Confirmed Decisions

1. The game is called **BULLISH!**: a chibi finance-bro/life simulation featuring a fictional stock market and financial education.
2. **Balance gameplay and education**.
3. A **3–4-person team**.
4. Include **Bank and Arbitrage** (simple Oil/bundle puzzle).
5. **Frontend: React + Vite + TypeScript**.
6. **Backend: Node.js + Express + TypeScript**.
7. **REST API, PostgreSQL + Prisma**.
8. Backend manages and enforces game logic.

### Proposed Baseline (Pending Final Team Approval)

- 3 days, 3 fictional stocks, £10,000 starting cash.
- 100 agents across 6 behavior groups.
- Bank: one Savings Account, 2% monthly interest, £5,000 deposit limit, 1 game day = 1 month. Interest can exceed the deposit limit.
- Arbitrage: one puzzle and attempt per day, instant profit/loss settlement.
- Modular monolith, monorepo, shared TypeScript contracts.
- Seeded scenarios and Reset for a reliable demo.
- Reports explain the actual simulation outcomes.
- Prisma **v7 was recommended earlier; it is not a confirmed version**.

### Open Questions

1. What is the official hackathon theme/judging rubric?
2. Which Prisma major version and migration conventions will the team use?
3. Should Reset reuse the same `gameId` or create a new session?
4. How are session tokens issued, stored, and transmitted?
5. What price floor/tick-size rounding guarantees the intended ±10% daily cap?
6. How should agent parameters be tuned against seeded three-day scenarios, and what tests will prove behavior?
7. What are the Arbitrage `maxQuantity` rules and incorrect-answer feedback?
8. Which specific flat/pixel/chibi art direction and asset-production workflow?
9. Which deployment and test-database providers and how will secrets be managed?
10. Should final risk scoring be informational or contribute to an aggregate score?

### Working Principles

- **Build the smallest playable version first.**
- **One complete gameplay loop is better than disconnected features.**
- No real-money transactions or investment advice.
- Make it fun *and* educational: one decision → one consequence → one explanation.
- Keep engines pure and testable; make database updates atomic.
- Use reproducible seeded demos, Reset, a short playthrough, and a fallback.
- Prioritize the official hackathon requirements when announced.

---

## Appendix — Demo Pitch

> “Most people see stock trading as numbers on a screen. We wanted to make financial literacy feel like living a life — where every daily decision, from reading the news to managing savings, teaches you how markets and money work.”

**Demo flow:** Finance bro wakes up → reads Nova AI news → predicts Bullish → buys stock → deposits into Savings → completes Oil arbitrage → End Day (crowd simulation) → Daily Report (Market + Interest + Arbitrage) → two more days (FOMO and market reversal) → Final Report → Reset.

**Short tagline:** *BULLISH! — Build a life. Read the market. Make your move.*

### Source Materials

- `BULLISH_Project_Summary.docx`, uploaded by the user (original project brief).
- The idea analysis, product strategy, MVP, UI/UX, Bank, Arbitrage, Game State, API, and engine designs discussed in this conversation.
- User-provided Oil / Sack of Oil visual reference.
- This is a **README/specification**, not an already-running application or an executed database migration.

---

_— crafted with creativity by [pinecraft.vn](https://pinecraft.vn)_
