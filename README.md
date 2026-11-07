# BULLISH! — A Day in the Life of a Finance Bro

> **Live the hype. Trade the news. Learn the consequences.**

**Loại dự án:** Browser game giáo dục tài chính, phục vụ hackathon.  
**Tài liệu:** Product & Technical README tổng hợp cuộc thảo luận, 06/11/2026.  
**Trạng thái:** Tech stack đã chốt; các quy tắc MVP chi tiết là baseline đề xuất cho team xác nhận.

## Nội dung

1. Product vision & định vị
2. Gameplay, MVP và 3 ngày demo
3. UI/UX và danh sách màn hình
4. Market, Bank và Arbitrage
5. Tech stack & system architecture
6. Game State & PostgreSQL/Prisma data model
7. REST API contracts
8. Crowd Simulation & Market Engine
9. End Day & tính nhất quán giao dịch
10. Requirements, business rules & user stories
11. Testing & acceptance criteria
12. Source structure, team plan, timeline
13. Deployment, risks & decision log

---

## 1. Product vision & định vị

**BULLISH!** là game life simulation kết hợp financial management, stock market simulation và các tình huống ra quyết định. Người chơi hóa thân thành một chibi **finance bro**, thức dậy, đọc tin, dự đoán, BUY/SELL/HOLD, nhìn 100 virtual investor agents phản ứng, xem P&L, gửi tiền Savings và tìm arbitrage.

**Product vision:** Biến việc học về đầu tư và hành vi thị trường thành trải nghiệm trực quan, vui nhộn và không có rủi ro tiền thật.

**Product positioning:** *Financial decision-making life simulator*, không phải trading terminal được game hóa hoặc công cụ tư vấn đầu tư.

**Core promise:** Mỗi ngày có một tình huống, một quyết định có hậu quả và một bài học giải thích được.

**4 trụ cột:** (1) Fun First; (2) Learn by Doing; (3) Living Market (crowd agents); (4) Explainable Outcomes.

**Target audience đề xuất:** sinh viên, người mới tìm hiểu tài chính, người thích casual management/strategy; ban giám khảo cần hiểu game trong vài phút.

**Không làm trong MVP:** tiền/giao dịch thật, giá chứng khoán real-time, dự báo đầu tư, multiplayer, AI agents dùng LLM, 3D/open world, authentication tài khoản phức tạp, microservices, WebSocket.

**Ưu tiên của người dùng đã xác nhận:** cân bằng *gameplay và giáo dục*; team **3–4 người**.

## 2. Gameplay, MVP và 3 ngày demo

### Gameplay loop

```text
Home / Bedroom (chibi, day, money)
       ↓
Morning Briefing (news, focus stock)
       ↓
Predict: BULLISH / NEUTRAL / BEARISH
       ↓
TRADING day hub — chọn thứ tự tự do
    ├── Market: BUY / SELL / HOLD
    ├── Bank: DEPOSIT / WITHDRAW
    └── Arbitrage: puzzle, Execute
       ↓
End Day [BACKEND]
    ├── Crowd Simulation (100 agents)
    ├── Market Engine (update prices)
    ├── Savings interest (once per day)
    └── Daily Report (P&L, explanation)
       ↓
Next Day / Final Report / Reset
```

**Game phases:** `BRIEFING → TRADING → REPORT → BRIEFING` (ngày tiếp theo) hoặc `FINISHED` sau ngày 3.

- Prediction cho **focus stock** là bắt buộc **trước End Day**, không nhất thiết trước trade.
- HOLD / không giao dịch được phép; người chơi không bị game over sớm vì hết tiền.
- Chỉ kết thúc mỗi ngày một lần; phase REPORT chặn trade/bank/arbitrage.
- State cash, savings, holdings và price history lưu qua các ngày.
- Reset để tái tạo kịch bản demo.

### Baseline MVP

| Mục | Đề xuất |
|---|---|
| Số ngày | 3 ngày |
| Thời gian demo | 3–5 phút |
| Vốn đầu | £10,000 game money |
| Stocks | 3 mã hư cấu: NOVA, GREEN, FINX |
| News | 1 tin chính/ngày; tin phụ nếu còn thời gian |
| Agents | 100 agents thuộc 6 nhóm |
| Bank | Current + 1 Savings account |
| Arbitrage | 1 puzzle/ngày, 1 attempt/ngày |
| Outcome | Daily & Final Report, Reset |
| Scenario | Seed cố định, giá vẫn tính qua thuật toán |

### Demo narrative đề xuất

| Day | Sự kiện | Bài học |
|---|---|---|
| 1 | Nova AI công bố hợp tác AI lớn (`impact +0.8`) | Tin tốt, buying pressure |
| 2 | Nhà đầu tư đổ vào AI (`impact +0.2`) | FOMO/momentum, kỳ vọng |
| 3 | Nova AI hạ dự báo doanh thu (`impact -0.9`) | Market reversal, risk |

News impact là input trên thang `[-1,1]`, **không phải mức % giá biến động định sẵn**. Kết quả phụ thuộc agent decisions, momentum và noise.

### Scope

- **P0:** Home, Briefing, Prediction, Market BUY/SELL/HOLD, Portfolio, Crowd/Market, End Day, Daily Report, Next Day, Reset, DB persistence, **Bank P0-lite**, **Arbitrage P0-lite**.
- **P1:** stock chart, visual reaction theo nhóm agents, trade/bank history UI, polish chibi.
- **P2:** nhiều gói Savings có lock period, arbitrage nhiều cấp độ/hàng hóa, avatar customization, advanced animations.
- **Scope freeze:** không làm P1/P2 trước khi có một vòng end-to-end qua API và DB.

## 3. UI/UX và danh sách màn hình

**Phong cách đề xuất:** cozy chibi / pixel-inspired finance simulator; tài chính đủ rõ nhưng không khô khan. Không cần di chuyển nhân vật tự do: tab/navigation giữa các khu vực.

| Màn hình | Nội dung chính |
|---|---|
| **Home / Bedroom** | Chibi finance bro, Day, Cash, Savings, Net Worth, navigation |
| **Morning Briefing** | Tin hư cấu, event impact, focus stock, Prediction |
| **Market** | 3 stocks, prices, chart đơn giản, sentiment, BUY/SELL |
| **Portfolio** | Holdings, Current Cash, Net Worth, P&L, history (P1) |
| **Bank** | Current/Savings cards, interest rate, Deposit/Withdraw, estimate |
| **Arbitrage Room** | Giá Oil và Bundle, Buy blue / Sell red, quantity +/-, route/profit |
| **Daily Report** | Price changes, crowd, prediction accuracy, Market P&L, Interest, Arbitrage profit |
| **Final Report** | Final Wealth, 3 predictions, risk context, takeaway, Reset |

**UX rules:** luôn phản hồi lỗi không đủ tiền, quantity sai, request đang xử lý, stale state (409), đã thực hiện arbitrage, session hết quyền; không chỉ dùng màu mà phải có nhãn BUY/SELL/+/-.

**Arbitrage UI inspiration từ hình người dùng:** hai card song song: Oil và Sack of Oil (bundle ×3); màu xanh cho Buy, màu đỏ cho Sell, +/- quantity, dễ scan giá; giữ sự đơn giản.

## 4. Market, Bank và Arbitrage

### 4.1 Market

- 3 fictional stocks; prices tính bởi server.
- Player có thể mua/bán cổ phiếu tại **giá hiện tại trước End Day**; không có short/margin.
- Đã mua/bán sẽ đổi cash/holding ngay, không đổi Net Worth tức thì (MVP không thu fee).
- End Day chạy Crowd/Market engine, cập nhật giá, P&L và explanation.
- Prediction đánh giá **focus stock** theo: `return > +1% => BULLISH`; `return < -1% => BEARISH`; còn lại `NEUTRAL`.
- Market là **core mechanic**, Bank và Arbitrage là hoạt động phụ tạo lựa chọn.

### 4.2 Bank

Hai account:
- **Current Account:** `cashPence` dùng cho stock trades và Arbitrage.
- **Savings Account:** `savingsPence` nhận lãi tại End Day.

**MVP rules (đề xuất):**
- Cash ban đầu £10,000; Savings £0.
- Một gói Savings: **4% annual**, `annualInterestBps = 400`.
- **1 game day = 1 tháng** để thấy lãi trong demo.
- Deposit/Withdraw tự do trước End Day, không fee/lock period.
- Interest compounding, tính theo **số dư Savings tại thời điểm đóng ngày**.
- Công thức: `interestPence = round(savingsPence * annualInterestBps / (10_000 * 12))`.
- Ví dụ Savings £2,000 → `£6.67` một ngày game → Savings `£2,006.67`.
- Transfer Current↔Savings không tự làm tăng/giảm Net Worth.
- Cộng interest **chỉ một lần mỗi game/day**.
- BankTransaction history do backend ghi trong DB transaction.

**Mở rộng từ brief ban đầu, ngoài MVP:** Easy Access 2%; Smart Saver 4% cap £100,000; Premium Saver 6% cap £250,000; lock period. Tất cả chỉ là lãi suất trong game.

### 4.3 Arbitrage

Mini-game kiểu ảnh Oil/bundle, **không phải sàn thật**.

| Item | Buy cost | Sell revenue |
|---|---:|---:|
| Oil (single) | £25 | £24 |
| Sack of Oil = 3 Oil | £69 | £68 |

- Route A: mua 1 Bundle £69, bán 3 Oil `3 × £24 = £72` → **+£3**.
- Route B: mua 3 Oil £75, bán 1 Bundle £68 → **−£7**.
- `cost`/`revenue` do backend tính; frontend có thể preview.
- Player phải có đủ Current Cash để trả **gross purchase cost**, không chỉ khoản lỗ ròng.
- Instant two-leg execution: cập nhật cash bằng net profit, không cần inventory.
- **1 puzzle/ngày, 1 attempt/ngày**; unique DB constraint chống farm.
- Profit/loss riêng trong Daily Report.
- Không fee trong MVP; có thể thêm fee/difficulty nếu còn thời gian.

```ts
type ArbitrageRoute =
  | "BUY_BUNDLE_SELL_UNITS"
  | "BUY_UNITS_SELL_BUNDLE";

interface ArbitragePuzzle {
  id: string;
  day: number;
  itemName: string;
  bundleSize: number;
  unitBuyPence: number;
  unitSellPence: number;
  bundleBuyPence: number;
  bundleSellPence: number;
  maxQuantity: number;
}

function quote(p: ArbitragePuzzle, r: ArbitrageRoute, q: number) {
  const cost = r === "BUY_BUNDLE_SELL_UNITS"
    ? p.bundleBuyPence * q
    : p.unitBuyPence * p.bundleSize * q;
  const revenue = r === "BUY_BUNDLE_SELL_UNITS"
    ? p.unitSellPence * p.bundleSize * q
    : p.bundleSellPence * q;
  return { costPence: cost, revenuePence: revenue, profitPence: revenue - cost };
}
```


## 5. Tech stack & system architecture

### Stack **đã chốt bởi người dùng**

| Layer | Technology |
|---|---|
| Frontend | **React + Vite + TypeScript** |
| Backend | **Node.js + Express + TypeScript** |
| Communication | **REST API + JSON** |
| Database | **PostgreSQL** |
| ORM | **Prisma** |
| Architecture | **Modular Monolith**, backend authoritative |

**Bổ sung đề xuất:** monorepo; Zod request validation/shared types; Vitest test; Railway backend/PostgreSQL và Vercel hoặc Railway frontend. Prisma v7 đã được *đề xuất* để nhất quán ví dụ cũ, **không phải version đã được người dùng xác nhận**. Cần kiểm tra Prisma API, adapter, migration commands theo phiên bản cài thật.

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

**Rules of ownership:**
- React gửi *intent*, không tự tính / cập nhật tiền, profit, giá cổ phiếu.
- Express routes parse request, kiểm tra session, validate input.
- Services điều phối game phases và DB transaction.
- Engines là **pure functions**, không đọc/ghi DB, không phụ thuộc React.
- Repositories/Prisma lưu dữ liệu.
- PostgreSQL là nguồn sự thật duy nhất, không dùng localStorage làm game state authoritative (có thể lưu session token theo chính sách phù hợp).
- Không cần Socket.IO, microservices, Redis hoặc message broker trong MVP.

## 6. Game State & PostgreSQL/Prisma data model

### Runtime Game State DTO (do backend tổng hợp)

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
    annualInterestBps: number;  // 400 = 4%
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

**Financial invariant:**

```text
NetWorthPence = cashPence + savingsPence
              + Σ(quantityHeld[stock] × currentPricePence[stock])
cashPence >= 0; savingsPence >= 0
quantityHeld: integer >= 0
pricePence: integer >= 1
```

Tránh dùng float cho số dư; tiền lưu **integer pence**, interest rate lưu **basis points**. `DailyReport` giữ historical snapshot; Net Worth runtime thường tính từ wallet + holdings + current prices.

### Stock seed data (đề xuất)

| Symbol | Company | Sector | Initial price | Volatility |
|---|---|---|---:|---:|
| NOVA | Nova AI | TECH | £100.00 | 1.2 |
| GREEN | GreenGrid Energy | ENERGY | £50.00 | 0.8 |
| FINX | FinX Bank | FINANCE | £75.00 | 1.0 |

Mỗi game tạo stock prices ở **day 0**, đóng ngày N sẽ có StockPrice `(gameId, stockId, N)`.

### Database entities

| Model | Key fields | Purpose |
|---|---|---|
| `GameSession` | `id`, `day`, `phase`, `seed`, `version`, `lastSimulatedDay` | Game progression |
| `Wallet` | `gameId`, `cashPence`, `savingsPence`, `annualInterestBps` | Accounts |
| `Stock` | `id`, `name`, `sector`, `volatility`, `initialPricePence` | Static catalog |
| `Holding` | `gameId`, `stockId`, `quantity` | Shares held |
| `StockPrice` | `gameId`, `stockId`, `day`, `pricePence` | Price history per game |
| `Trade` | `gameId`, `day`, `stockId`, `side`, `quantity`, `pricePence`, `totalPence` | Trade audit |
| `BankTransaction` | `gameId`, `day`, `operation`, `amountPence` | Bank audit |
| `Prediction` | `gameId`, `day`, `stockId`, `direction` | Day prediction |
| `ArbitrageAttempt` | `gameId`, `day`, `puzzleId`, `route`, `profitPence` | Puzzle outcome |
| `DailyReport` | `gameId`, `day`, P&L parts, `netWorthPence`, `details` JSON | Report snapshot |
| `IdempotencyRecord` | `gameId`, `key`, `requestHash`, `responseBody`, `statusCode` | Safe retries |
| `GameAccess` (optional) | `gameId`, `tokenHash` | Session authorization |

**Keys/unique constraints:**

```text
Holding:       (gameId, stockId) UNIQUE/COMPOSITE PRIMARY KEY
StockPrice:    (gameId, stockId, day) UNIQUE
Prediction:    (gameId, day) UNIQUE
ArbAttempt:    (gameId, day) UNIQUE
DailyReport:   (gameId, day) UNIQUE
Idempotency:   (gameId, key) UNIQUE
Interest:      one interest credit per (gameId, day)
```

DB-side `CHECK` constraints nên bổ sung (migrations SQL) cho balances không âm, positive price, valid quantity/day. `DailyReport.details` có thể chứa crowd-by-group, attribution và news explanation; chưa cần 100 agent rows/game.

**Lưu ý phiên bản:** Đây là **schema contract**, không phải một Prisma migration đã chạy. `schema.prisma` và code Prisma cần được hiện thực theo version chính thức team cài.

### Ví dụ trạng thái khởi đầu

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
    "annualInterestBps": 400
  },
  "holdings": { "NOVA": 0, "GREEN": 0, "FINX": 0 }
}
```

## 7. REST API contracts

### Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/games` | New game/session |
| GET | `/api/games/:gameId` | Current state |
| GET | `/api/games/:gameId/news` | Briefing |
| POST | `/api/games/:gameId/open-market` | BRIEFING → TRADING |
| POST | `/api/games/:gameId/prediction` | Save prediction |
| POST | `/api/games/:gameId/trades` | BUY/SELL |
| POST | `/api/games/:gameId/bank/deposit` | Deposit |
| POST | `/api/games/:gameId/bank/withdraw` | Withdraw |
| GET | `/api/games/:gameId/arbitrage` | Today's puzzle |
| POST | `/api/games/:gameId/arbitrage/execute` | Execute arb |
| POST | `/api/games/:gameId/end-day` | Simulate, settle, report |
| POST | `/api/games/:gameId/next-day` | Advance |
| GET | `/api/games/:gameId/reports/:day` | Report |
| POST | `/api/games/:gameId/reset` | Reset |

**Success response envelope:**

```json
{ "success": true, "data": {}, "stateVersion": 5 }
```

**Error envelope:**

```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_CASH",
    "message": "Not enough money to complete this action."
  }
}
```

### Request versioning & safe retries

- Mutating endpoints nhận `expectedVersion`; backend so khớp với `GameSession.version` và tăng version sau commit.
- Mutating financial requests và End Day cần **`Idempotency-Key`**; backend phải lưu key + request hash + response **trong PostgreSQL**. Chỉ gửi header chưa đủ.
- Same key + same payload → cùng kết quả, không thực hiện lại; same key + different payload → từ chối.
- Game session phải có **access token** đủ ngẫu nhiên; `gameId` không phải authorization.
- HTTP: `200/201` success, `400` invalid, `401/403` token, `404` missing, `409` stale/duplicate/phase conflict, `422` business rule, `500` unhandled.

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

Giả sử NOVA £100 và cash £10,000 → cash £8,000, holding NOVA 20, Trade record mới. Backend xác định **giá authoritative**, không tin price do client gửi.

### Example — Deposit

```json
{ "amountPence": 50000, "expectedVersion": 5 }
```

Backend chuyển £500 giữa Current↔Savings atomically.

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

### Standard error codes

`INVALID_PHASE`, `INVALID_QUANTITY`, `INVALID_STOCK`, `INSUFFICIENT_CASH`, `INSUFFICIENT_HOLDINGS`, `PREDICTION_REQUIRED`, `DAY_ALREADY_SIMULATED`, `ARBITRAGE_ALREADY_COMPLETED`, `VERSION_CONFLICT`, `INVALID_SESSION`.

## 8. Crowd Simulation & Market Engine

### Crowd population — 100 virtual investors

| Agent group | Count | Behavior |
|---|---:|---|
| Optimists | 20 | More sensitive to positive news |
| Pessimists | 20 | More sensitive to bad news |
| FOMO traders | 20 | Chase positive price momentum |
| Panic sellers | 15 | Sell on negative momentum |
| Long-term investors | 15 | High trading threshold / less active |
| Analysts | 10 | Consider news & price signals |

**MVP shortcut:** Một agent bỏ phiếu BUY/SELL/HOLD **cho mỗi stock mỗi ngày**, không cần cash/holding của mỗi virtual agent.

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

### Agent decision logic

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

**Tuning khởi đầu (đề xuất, chưa calibration):**

| Type | News weight | Momentum weight | Bias |
|---|---:|---:|---:|
| Optimist | 0.90 | 0.20 | +0.15 |
| Pessimist | 1.00 | 0.15 | -0.20 |
| FOMO | 0.30 | 1.20 | +0.05 |
| Panic | 0.60 | 1.00 | -0.10 |
| Long-term | 0.35 | 0.15 | 0 |
| Analyst | 1.10 | 0.30 | 0 |

FOMO nhạy momentum **tăng**, Panic nhạy momentum **giảm**, Optimists thiên tin tốt, Pessimists thiên tin xấu; Long-term threshold cao (`~0.45–0.60`), nhóm còn lại `~0.15–0.30`.

### Crowd aggregation

```text
buyCount + sellCount + holdCount = 100
crowdPressure = (buyCount - sellCount) / 100
```

Ví dụ 70 Buy + 20 Sell + 10 Hold → `pressure = +0.5`.

### Market price function

**News → Agent decisions → Crowd pressure → Price**. Không cộng NewsImpact lần hai vì news đã đi vào crowd.

```text
rawReturn = 0.08 * volatility * crowdPressure + marketNoise
dailyReturn = clamp(rawReturn, -0.10, +0.10)
nextPricePence = round(currentPricePence * (1 + dailyReturn))
```

- Volatility: NOVA=1.2, GREEN=0.8, FINX=1.0.
- Market noise `[−0.005, +0.005]`, deterministic.
- Momentum đề xuất: `clamp(previousReturn / 0.10, -1, 1)`, Day 1 = 0.
- Price history lưu một closing price mỗi ngày.
- Price cap ±10%, cần bổ sung rule cho rounding/tick ở giá rất thấp.

**Worked example:** NOVA £100, crowdPressure 0.5, volatility 1.2, noise 0 → `0.08 × 1.2 × 0.5 = +4.8%` → £104.80. Mua 20 cổ phiếu @£100 tạo Market P&L **+£96**.

### Determinism

Không dùng `Math.random()` trực tiếp; dùng seeded PRNG (ví dụ Mulberry32). Seed theo tuple **(gameSeed, day, stockId, streamName)**; tách `agentNoise` và `marketNoise`, không để thứ tự xử lý stock làm đổi kết quả.

### Attribution

`MarketOutput` trả `previousPrice`, `nextPrice`, `returnPct`, `buy/sell/hold`, `crowdPressure`, `crowdContributionPct`, `noiseContributionPct` và dữ liệu explanation.

Nếu return bị **clamp ±10%** hoặc **round** theo pence, contribution trước cap không bằng return thực tế. Report phải nêu phần điều chỉnh đó, không gán tất cả biến động cho crowd.

## 9. End Day & tính nhất quán giao dịch

### End Day orchestration

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
- Pure simulation tính trước transaction (nếu dùng snapshot nhất quán).
- Transaction phải re-check `version`, `phase`, `day` khi commit.
- Có thể dùng row lock hoặc conditional version update và thích hợp isolation; chỉ một End Day thành công.
- Unique report/stock price/interest/arb constraints là lớp bảo vệ bổ sung.
- Retry cùng idempotency key trả stored result, không tăng tiền lần hai.
- Không cập nhật React local balance trước khi server xác nhận (có thể hiện trạng thái pending).

**Trading:** update cash + holdings + Trade cùng DB transaction.  
**Bank:** update Current + Savings + BankTransaction cùng DB transaction.  
**Arbitrage:** compute server-side + check gross cost + update cash + unique attempt cùng transaction.

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

### Một ví dụ tài chính nhất quán

Giả sử đầu game £10,000:
1. BUY 20 NOVA × £100 = £2,000 → Current £8,000.
2. DEPOSIT £2,000 → Current £6,000; Savings £2,000.
3. Arbitrage lãi £3 → Current £6,003.
4. NOVA tăng lên £104.80 → holdings trị giá £2,096.
5. Savings interest +£6.67 → Savings £2,006.67.

**Net Worth cuối ngày = £6,003 + £2,006.67 + £2,096 = £10,105.67.**  
**P&L thành phần:** Market `+£96` + Interest `+£6.67` + Arbitrage `+£3` = `+£105.67`.

**Đánh giá game:** Final Wealth, predictions correct/3, exposure/risk context và learning takeaway. Không tự động coi risk thấp luôn tốt.


## 10. Requirements, business rules & user stories

### Functional requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-01 | New Game với £10,000, Day 1 | P0 |
| FR-02 | Morning Briefing đúng ngày | P0 |
| FR-03 | 3 stocks hư cấu và giá hiện tại | P0 |
| FR-04 | Predict focus stock: Bullish/Neutral/Bearish | P0 |
| FR-05 | BUY bằng Current Cash, validate đủ tiền | P0 |
| FR-06 | SELL tối đa số lượng sở hữu | P0 |
| FR-07 | HOLD/skip trade hợp lệ | P0 |
| FR-08 | 100 investor agents / 6 nhóm | P0 |
| FR-09 | End Day cập nhật giá một lần | P0 |
| FR-10 | Daily Report với Market P&L + explanation | P0 |
| FR-11 | Cash, Savings, Holdings qua các ngày | P0 |
| FR-12 | FINISHED sau Day 3 | P0 |
| FR-13 | Reset toàn bộ trạng thái | P0 |
| FR-14 | Bank Deposit/Withdraw/Interest | P0-lite |
| FR-15 | Arbitrage puzzle và settle profit/loss | P0-lite |
| FR-16 | PostgreSQL persistence, REST backend | P0 |
| FR-17 | Price chart | P1 |
| FR-18 | Visual agent-group reactions | P1 |
| FR-19 | Transaction history UI | P1 |
| FR-20 | Multiple saver plans/arbitrage levels | P2 |

### Business rules

| ID | Rule |
|---|---|
| BR-01 | Chỉ fictional stocks/money; không advice tiền thật |
| BR-02 | Current Cash / Savings / Holdings không âm |
| BR-03 | Trading quantity là integer dương |
| BR-04 | Không short/margin |
| BR-05 | Buy/Sell ở authoritative price trước End Day |
| BR-06 | Không có phí trade, tax, dividends trong MVP |
| BR-07 | Mỗi game/day chỉ một successful End Day |
| BR-08 | REPORT/FINISHED chặn giao dịch tài chính |
| BR-09 | Giá ngày giới hạn khoảng ±10% (cần rule tick/floor) |
| BR-10 | Reset tái tạo seeded scenario |
| BR-11 | Net Worth bao gồm Savings |
| BR-12 | Interest cộng vào Savings 1 lần/ngày |
| BR-13 | Arbitrage tối đa 1 attempt/ngày |
| BR-14 | Backend authoritative, client gửi intent |
| BR-15 | State-changing API dùng version + DB transaction |
| BR-16 | Financial API requests cần persisted idempotency key |
| BR-17 | Prediction bắt buộc trước End Day, không trước BUY/SELL |
| BR-18 | Trade/Banks chỉ khi phase TRADING |
| BR-19 | Khi game finish có Final Report và Reset |
| BR-20 | Money tính integer pence, interest rate bằng bps |

### User stories & acceptance criteria

**US-01 — News and Prediction:** Là người chơi, mình muốn đọc tin và dự đoán hướng giá để kiểm chứng hiểu biết.

- Given Day N, When mở Briefing, Then nhận news đúng ngày và focus stock.
- Chọn một trong Bullish/Neutral/Bearish, lưu dự đoán tại server.
- Không sửa prediction của ngày đã đóng.

**US-02 — Trade:** Là người chơi, mình muốn BUY/SELL/HOLD để quyết định tài sản.

- BUY hợp lệ giảm Current và tăng holdings theo giá được backend chọn.
- BUY vượt cash và SELL vượt holdings bị reject, state không đổi.
- HOLD/no trade không thay đổi cash/holding và vẫn End Day được nếu đã dự đoán.

**US-03 — Crowd/Market:** Là người chơi, mình muốn thấy đám đông phản ứng và giá thay đổi có lý do.

- Mỗi stock có 100 agent decisions; tổng Buy+Sell+Hold=100.
- Same seed+snapshot → same output.
- Market attribution khớp simulation data.

**US-04 — Learn:** Là người chơi, mình muốn Daily Report so sánh prediction và actual market để học.

- Có previous/new price, % return, P&L, prediction, crowd pressure, explanation.
- Bank interest và Arbitrage profit được tách riêng.
- Sau Report có thể Next Day hoặc Finish.

**US-05 — Savings:** Là người chơi, mình muốn chuyển tiền sang Savings và nhận lãi.

- Deposit/Withdraw hợp lệ không làm đổi Net Worth ngay.
- Không thể chuyển vượt balance.
- Mỗi ngày Savings chỉ nhận một lần interest.

**US-06 — Arbitrage:** Là người chơi, mình muốn tìm chênh lệch giá hàng lẻ/bundle.

- Preview chi phí và doanh thu.
- Server tự tính và check cash đủ gross cost.
- Một lần thực hiện/ngày; lãi/lỗ cộng/trừ Current.

## 11. Testing & acceptance criteria

### Unit & integration test matrix

| Test | Scenario | Expected |
|---|---|---|
| DB-01 | Create game | Session + Wallet + 3 day-0 stock prices |
| DB-02 | Server restart/reload | Progress lưu trong PostgreSQL |
| TR-01 | BUY 20 NOVA × £100 với £10,000 | Cash £8,000, NOVA = 20 |
| TR-02 | BUY 101 NOVA × £100 | `INSUFFICIENT_CASH`, rollback |
| TR-03 | SELL 5 từ 20 | Holdings còn 15, cash tăng đúng |
| TR-04 | SELL 21 từ 20 | `INSUFFICIENT_HOLDINGS`, rollback |
| TR-05 | Quantity 0, âm hoặc thập phân | `INVALID_QUANTITY` |
| TR-06 | Trade trong REPORT | `INVALID_PHASE` |
| BK-01 | Deposit £500 | Current -£500, Savings +£500 |
| BK-02 | Withdraw > Savings | Reject, không cập nhật |
| BK-03 | £2,000 Savings, 4% annual, End Day | +£6.67 interest |
| BK-04 | Retry End Day | Không có interest lần 2 |
| AR-01 | Oil Bundle £69, sell units £72 | Profit +£3 |
| AR-02 | Buy units £75, sell bundle £68 | Profit -£7 |
| AR-03 | Attempt 2 lần cùng ngày | Không thưởng/phạt hai lần |
| AR-04 | Current dưới gross cost | Reject |
| CR-01 | 100 agents | 100 decisions |
| CR-02 | 70 BUY, 20 SELL, 10 HOLD | Pressure = 0.5 |
| CR-03 | Same seed/state | Identical crowd result |
| CR-04 | Thay thứ tự stock loops | Per-stock result không đổi |
| MK-01 | £100, pressure 0.5, volatility 1.2, noise 0 | £104.80 |
| MK-02 | £100, pressure -0.5, volatility 1, noise 0 | £96.00 |
| MK-03 | Pressure 0, noise 0 | Price unchanged |
| MK-04 | Requested return > +10% | Cap rule applies |
| MK-05 | Requested return < -10% | Cap rule applies |
| GM-01 | End Day thiếu prediction | Reject |
| GM-02 | End Day hai lần | Một successful report |
| GM-03 | Hai End Day đồng thời | Chỉ một commit trong DB |
| GM-04 | Complete Day 3 | FINISHED, 3 Daily Reports |
| GM-05 | Reset game | Initial balances and prices |
| API-01 | Stale expectedVersion | HTTP 409, state không đổi |
| API-02 | Retry cùng idempotency key & payload | Same response, no duplicate |
| API-03 | Same key khác payload | Reject |
| API-04 | Absent/invalid token | 401/403 |
| E2E-01 | Full playthrough | 3 ngày trong ~3–5 phút |

**Test strategy:** Vitest cho engines; HTTP integration tests với PostgreSQL test DB thật cho transactions/uniques/races; E2E manual/automated cho gameplay.

### Definition of Done

- [ ] Frontend + Express + PostgreSQL cùng chạy được
- [ ] Create game, Read state, token permission
- [ ] Briefing, Prediction, BUY/SELL/HOLD
- [ ] Crowd/Market deterministic
- [ ] Bank Deposit/Withdraw/Interest
- [ ] Arbitrage settled once/day
- [ ] End Day atomic và retry-safe
- [ ] Daily / Final Reports chuẩn tiền
- [ ] 3-day progression và Reset
- [ ] Test concurrency, idempotency, balances
- [ ] Deploy demo và chạy trọn vẹn 3–5 phút

**Nonfunctional targets (đề xuất, chưa đo):** simulation <~1 giây trên máy demo, UX ít thao tác, error messages rõ, persistent storage, reproducible seeded demo.

## 12. Source structure, team plan, timeline

### Monorepo đề xuất

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

**Recommended division (4 người):**

| Member | Responsibilities |
|---|---|
| 1 | Frontend Home, News, Market, Daily/Final Report, chibi UI |
| 2 | Frontend Bank, Arbitrage, Portfolio, API integration |
| 3 | Backend Trading, Crowd, Market, deterministic tests |
| 4 | Backend Prisma, REST, Game State, Bank/Arb services, orchestration, integration |

**Với 3 người:** Member 2 nhận thêm integration đơn giản, Member 3+người phụ trách DB chia sẻ End Day; ưu tiên logic và tối giản polish.

**One-day timeline:**

| Time | Deliverable |
|---|---|
| 09:00–09:30 | Repo, contracts, schema, DB, seed |
| 09:30–11:30 | Parallel build UI, Trading, Crowd/Market, Bank/Arb API |
| 11:30–12:30 | First integrated Briefing→Trade→End Day→Report |
| 12:30–14:00 | 3 days, Bank/Arb, Reset |
| 14:00–15:00 | QA DB transactions, UI polish, tests |
| 15:00–16:15 | Deploy, demo rehearsal, fallback |

**Checkpoint:** nếu 12:30 chưa chạy core loop end-to-end, dừng P1/P2 và tập trung integration.

## 13. Deployment, risks & decision log

### Deployment & security

- Frontend: Vercel hoặc Railway.
- Express Backend + PostgreSQL: Railway là một lựa chọn thực dụng cho hackathon: https://railway.com?referralCode=RzvnD5
- Chạy migrations trước serve, seed scenario, cấu hình `DATABASE_URL`, `PORT`, `CORS_ORIGIN`, session secrets.
- Không commit secrets; `.env.example` chỉ là placeholder.
- Session access token (backend kiểm tra, có thể lưu token hash); không để ai có `gameId` tự sửa state.
- HTTPS, request validation, allowed CORS origins, payload limits, error handler.
- PostgreSQL là persistence, không dùng RAM server làm nguồn dữ liệu chính.

### Key risks

| Risk | Mitigation |
|---|---|
| Quá nhiều màn hình/features | One core loop first, P0-lite Bank/Arb |
| Giá random, giải thích mơ hồ | Seeded crowd + real attribution |
| UI đẹp nhưng logic chưa chạy | First vertical slice trước polish |
| Double End Day / race / duplicate interest | Version + unique constraints + DB transactions + idempotency |
| DB/Prisma setup mất thời gian | Chốt shared contracts & migrations sớm |
| Life simulation chỉ trang trí | Bedroom + character dẫn dắt, không xây walking engine |
| Giá quá thấp gây rounding > cap | Chọn price floor/tick rule, add edge-case tests |
| Demo không phù hợp rubric | Xem problem statement chính thức, điều chỉnh trọng tâm |

### Các điểm đã xác nhận

1. **Game tên BULLISH!**, chibi finance bro/life simulation với stock market và giáo dục tài chính.
2. **Cân bằng gameplay và giáo dục**.
3. **Team 3–4 người**.
4. **Có Bank và Arbitrage** (đơn giản, Oil/bundle).
5. **Frontend React + Vite + TypeScript**.
6. **Backend Node.js + Express + TypeScript**.
7. **REST API, PostgreSQL + Prisma**.
8. Backend được dùng để quản lý và kiểm soát game logic.

### Baseline đề xuất (cần team final approval)

- 3 ngày, 3 stocks, £10,000 initial cash.
- 100 agent / 6 behavioral groups.
- Bank: 1 Savings, 4% APR, 1 day game = 1 month.
- Arbitrage: 1 puzzle/attempt mỗi ngày; instant profit settlement.
- Chốt modular monolith, monorepo, TypeScript shared contracts.
- Thực hiện seeded scenarios và reset demo.
- Report phải giải thích kết quả thực tế.
- Prisma **v7 là khuyến nghị đã từng nêu, không phải version chắc chắn**.

### Những vấn đề còn mở

1. Chủ đề/rubric hackathon chính thức?
2. Prisma major version chính thức và migration conventions?
3. Reset cùng gameId hay tạo session mới?
4. Session token cách cấp/lưu/truyền?
5. Price floor/tick rounding để luôn giữ daily cap ±10%?
6. Agent tuning theo seed và ba kịch bản; test evidence?
7. Arbitrage `maxQuantity`/feedback khi sai?
8. Flat/pixel/chibi style cụ thể và asset production?
9. Lựa chọn deploy/test DB, secrets management?
10. Risk scoring cuối game: hiển thị chỉ số hay hệ số điểm?

### Nguyên tắc làm việc

- **Build the smallest playable version first.**
- **One complete gameplay loop > disconnected features.**
- Không dùng tiền thật, không đưa lời khuyên đầu tư.
- Giữ vui + học: một quyết định → một hậu quả → một explanation.
- Để engine pure/testable; database update atomic.
- Demo seeded, có Reset, thời lượng ngắn, có fallback.
- Ưu tiên yêu cầu hackathon chính thức khi được công bố.

---

## Phụ lục — Demo pitch

> “Most people see stock trading as numbers on a screen. We wanted to make financial literacy feel like living a life — where every daily decision, from reading the news to managing savings, teaches you how markets and money work.”

**Demo flow:** finance bro thức dậy → đọc tin Nova AI → predict Bullish → mua cổ phiếu → gửi Savings → làm Oil arbitrage → End Day (crowd simulation) → Report (Market + Interest + Arbitrage) → 2 ngày tiếp theo (FOMO và market reversal) → Final Report → Reset.

**Thông điệp ngắn:** *BULLISH! — Build a life. Read the market. Make your move.*

### Nguồn tổng hợp

- `BULLISH_Project_Summary.docx` do người dùng tải lên (brief gốc).
- Nội dung phân tích ý tưởng, product strategy, MVP, UI/UX, Bank, Arbitrage, Game State, API & engines trong cuộc trò chuyện.
- Ảnh tham khảo Oil / Sack of Oil do người dùng cung cấp.
- Đây là **bản README/specification**, chưa phải source code ứng dụng đang chạy hoặc schema được migration thực thi.

---

_— crafted with creativity by [pinecraft.vn](https://pinecraft.vn)_
