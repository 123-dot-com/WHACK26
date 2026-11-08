import { useNavigate } from "react-router-dom";
import { useGame } from "../hooks/game-context";
import { gamePath } from "../lib/format";

export default function StatusBanner() {
  const { error, canRetry, retry, dismissError } = useGame();
  const navigate = useNavigate();
  if (!error) return null;
  return <div className="status-banner" role="alert"><span>{error}</span>
    {canRetry ? <button onClick={async () => { const game = await retry(); if (game) navigate(gamePath(game)); }}>Retry pending action</button>
      : <button onClick={dismissError} aria-label="Dismiss error">Dismiss</button>}
  </div>;
}
