import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "./game-context";

// REPORT is a closed day at night. Only the bed's wake action advances it.
export function useDayCycle() {
  const { game, busy, act } = useGame();
  const navigate = useNavigate();
  const [awake, setAwake] = useState(() => !["/Room", "/WakeUp"].includes(window.location.pathname));
  const [finalAwake, setFinalAwake] = useState(false);
  const [settling, setSettling] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const lastGame = useRef<{ id: string; day: number; phase: string; version: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => {
    if (!game) return;
    const previous = lastGame.current;
    if (previous && (previous.id !== game.gameId || (game.day === 1 && game.phase === "BRIEFING"
      && game.version > previous.version && (previous.day !== 1 || previous.phase !== "BRIEFING" || game.prediction === null)))) {
      setAwake(false); setFinalAwake(false); setMessage(null);
    }
    lastGame.current = { id: game.gameId, day: game.day, phase: game.phase, version: game.version };
  }, [game]);

  const night = game?.phase === "REPORT" || (game?.phase === "FINISHED" && !finalAwake);
  const sleeping = night || (game?.phase === "BRIEFING" && !awake);
  const canAct = Boolean(game && !sleeping && !settling && !busy && (game.phase === "BRIEFING" || game.phase === "TRADING"));

  const goToSleep = async () => {
    if (!game || busy || settling || sleeping) return;
    if (game.phase !== "TRADING" || !game.prediction) {
      setMessage("Choose your prediction in Stocks before going to sleep.");
      return;
    }
    setMessage(null); setSettling(true);
    const closed = await act({ type: "end-day" });
    if (closed) {
      navigate("/Room", { replace: true });
      timer.current = setTimeout(() => setSettling(false), 850);
    } else setSettling(false);
  };

  const wakeUp = async () => {
    if (!game || busy || settling) return;
    setMessage(null);
    if (game.phase === "REPORT") {
      const morning = await act({ type: "next-day" });
      if (!morning) return;
      setAwake(true); navigate("/Room", { replace: true });
    } else if (game.phase === "FINISHED") {
      setFinalAwake(true); navigate("/FinalReport");
    } else {
      setAwake(true); navigate("/Room", { replace: true });
    }
  };

  const restart = async () => {
    if (!game || busy || settling) return;
    const restarted = await act({ type: "reset" });
    if (!restarted) return;
    if (timer.current) clearTimeout(timer.current);
    setAwake(false); setFinalAwake(false); setSettling(false); setMessage(null);
    navigate("/Room", { replace: true });
  };

  return { night: Boolean(night), sleeping: Boolean(sleeping), settling, canAct, message, goToSleep, wakeUp, restart,
    dismissMessage: () => setMessage(null) };
}
