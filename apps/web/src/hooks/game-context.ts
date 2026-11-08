import { createContext, useContext } from "react";
import type { GameStateDTO } from "@bullish/shared";
import type { GameAction, GameSession } from "../api/client";

export interface GameContextValue {
  game: GameStateDTO | null;
  session: GameSession | null;
  loading: boolean;
  busy: boolean;
  error: string | null;
  canRetry: boolean;
  start: () => Promise<GameStateDTO | null>;
  act: (action: GameAction) => Promise<GameStateDTO | null>;
  retry: () => Promise<GameStateDTO | null>;
  refresh: () => Promise<void>;
  dismissError: () => void;
}

export const GameContext = createContext<GameContextValue | null>(null);
export function useGame() {
  const context = useContext(GameContext);
  if (!context) throw new Error("GameProvider is missing.");
  return context;
}
