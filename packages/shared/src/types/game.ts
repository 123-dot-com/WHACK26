export type StockId = "NOVA" | "GREEN" | "FINX";
export type GamePhase = "BRIEFING" | "TRADING" | "REPORT" | "FINISHED";
export type PredictionDirection = "BULLISH" | "NEUTRAL" | "BEARISH";

export interface GameStateDTO {
  gameId: string;
  day: number;
  phase: GamePhase;
  version: number;
  wallet: {
    cashPence: number;
    savingsPence: number;
    monthlyInterestBps: number;
    savingsDepositLimitPence: number;
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
  loan: {
    maxPrincipalPence: number;
    dailyInterestBps: number;
    lockedThroughDay: number;
    canBorrow: boolean;
    active: LoanDTO | null;
  };
  netWorthPence: number;
  reports: DailyReportDTO[];
}

export interface LoanDTO {
  id: string;
  principalPence: number;
  balancePence: number;
  repaymentPence: number;
  borrowedDay: number;
  dueDay: number;
  overdue: boolean;
}

export interface NewsDTO {
  day: number;
  category: "GOOD" | "BAD" | "NEUTRAL";
  focusStockId: StockId;
  affectedStockIds: StockId[];
  headline: string;
  impact: number;
}

export type AgentGroup = "OPTIMIST" | "PESSIMIST" | "FOMO" | "PANIC" | "LONG_TERM" | "ANALYST";
export interface CrowdResult {
  stockId: StockId;
  buyCount: number;
  sellCount: number;
  holdCount: number;
  pressure: number;
  byGroup: Record<AgentGroup, { buy: number; sell: number; hold: number }>;
}

export interface MarketResult extends CrowdResult {
  previousPricePence: number;
  nextPricePence: number;
  returnPct: number;
  crowdContributionPct: number;
  noiseContributionPct: number;
  capAdjustmentPct: number;
  roundingAdjustmentPct: number;
  explanation: string;
}

export interface DailyReportDTO {
  day: number;
  prediction: {
    stockId: StockId;
    chosen: PredictionDirection;
    actual: PredictionDirection;
    correct: boolean;
  };
  marketResults: MarketResult[];
  marketPnlPence: number;
  interestPence: number;
  arbitragePnlPence: number;
  // Optional for reports saved before loans were introduced.
  loanInterestPence?: number;
  loanBalancePence?: number;
  netWorthPence: number;
  exposurePct: number;
  takeaway: string;
}

export interface ArbitragePuzzleDTO {
  puzzleId: string;
  bundleSize: number;
  unitBuyPence: number;
  unitSellPence: number;
  bundleBuyPence: number;
  bundleSellPence: number;
  completedToday: boolean;
}
