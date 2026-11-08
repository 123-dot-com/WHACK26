import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { GameStateDTO } from "@bullish/shared";
import { ApiError, createGame, getGame, sendAction, type GameAction, type GameSession } from "../api/client";
import { GameContext } from "../hooks/game-context";

const SESSION_KEY = "bullish.session";
function storedSession(): GameSession | null {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(SESSION_KEY) ?? "null");
    if (stored && typeof stored === "object" && "gameId" in stored && "accessToken" in stored
      && typeof stored.gameId === "string" && typeof stored.accessToken === "string") {
      return { gameId: stored.gameId, accessToken: stored.accessToken };
    }
  } catch { /* An unavailable or outdated browser store should not block a new game. */ }
  return null;
}
type Attempt = { type: GameAction["type"]; input: unknown; key: string };

export default function GameProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<GameSession | null>(storedSession);
  const [game, setGame] = useState<GameStateDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canRetry, setCanRetry] = useState(false);
  const busyRef = useRef(false);
  const attemptRef = useRef<Attempt | null>(null);

  const accept = useCallback((state: GameStateDTO) => {
    setGame((previous) => previous?.gameId === state.gameId && previous.version > state.version ? previous : state);
  }, []);

  const handleError = useCallback((failure: unknown) => {
    setError(failure instanceof Error ? failure.message : "Something went wrong. Please try again.");
    if (failure instanceof ApiError && (failure.status === 401 || failure.status === 403 || failure.status === 404)) {
      try { localStorage.removeItem(SESSION_KEY); } catch { /* Optional browser persistence. */ }
      setSession(null); setGame(null);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    if (!session) { setLoading(false); return; }
    setLoading(true);
    void getGame(session, controller.signal).then(accept).catch((failure: unknown) => {
      if (!controller.signal.aborted) handleError(failure);
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [session, accept, handleError]);

  const refresh = async () => {
    if (!session || busyRef.current) return;
    setLoading(true);
    try { accept(await getGame(session)); }
    catch (failure) { handleError(failure); }
    finally { setLoading(false); }
  };

  const start = async () => {
    if (busyRef.current) return null;
    busyRef.current = true; setBusy(true); setError(null);
    try {
      const { accessToken, ...state } = await createGame();
      const nextSession = { gameId: state.gameId, accessToken };
      try { localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession)); } catch { /* Play without persistence. */ }
      setSession(nextSession); accept(state);
      return state;
    } catch (failure) { handleError(failure); return null; }
    finally { busyRef.current = false; setBusy(false); }
  };

  const execute = async (attempt: Attempt) => {
    if (!session || busyRef.current) return null;
    busyRef.current = true; setBusy(true); setError(null);
    attemptRef.current = attempt;
    try {
      const state = await sendAction(session, attempt.type, attempt.input, attempt.key);
      accept(state); attemptRef.current = null; setCanRetry(false);
      return state;
    } catch (failure) {
      if (failure instanceof ApiError && failure.status < 500) {
        attemptRef.current = null; setCanRetry(false); handleError(failure);
        if (failure.status === 409) {
          try { accept(await getGame(session)); } catch (reloadFailure) { handleError(reloadFailure); }
        }
      } else {
        setCanRetry(true);
        setError("The connection was interrupted. Retry the pending action to check its result safely.");
      }
      return null;
    } finally { busyRef.current = false; setBusy(false); }
  };

  const act = async (action: GameAction) => {
    if (!game || attemptRef.current || busyRef.current) return null;
    return execute({ type: action.type, input: { ...action.input, expectedVersion: game.version }, key: crypto.randomUUID() });
  };
  const retry = async () => attemptRef.current ? execute(attemptRef.current) : null;

  return <GameContext.Provider value={{ game, session, loading, busy: busy || canRetry, error, canRetry,
    start, act, retry, refresh, dismissError: () => setError(null) }}>{children}</GameContext.Provider>;
}
