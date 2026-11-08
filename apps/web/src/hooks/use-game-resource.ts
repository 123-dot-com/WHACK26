import { useEffect, useState } from "react";
import type { GameSession } from "../api/client";
import { useGame } from "./game-context";

export function useGameResource<T>(fetcher: (session: GameSession, signal?: AbortSignal) => Promise<T>) {
  const { session, game } = useGame();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    if (!session) return;
    const controller = new AbortController();
    setLoading(true); setData(null); setError(null);
    void fetcher(session, controller.signal).then((result) => {
      if (!controller.signal.aborted) setData(result);
    }).catch((failure: unknown) => {
      if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "Could not load this screen.");
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [session, game?.day, game?.version, fetcher, reload]);
  return { data, error, loading, reload: () => setReload((value) => value + 1) };
}
