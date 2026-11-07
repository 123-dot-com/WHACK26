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
    annualInterestBps: number;
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
