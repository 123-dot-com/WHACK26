import type { PredictionDirection } from "@bullish/shared";
import { Navigate, useNavigate } from "react-router-dom";
import { getNews } from "../api/client";
import { useGame } from "../hooks/game-context";
import { useGameResource } from "../hooks/use-game-resource";
import { gamePath } from "../lib/format";
import EndDayButton from "../components/EndDayButton";

const choices: Array<{ direction: PredictionDirection; icon: string; description: string }> = [
  { direction: "BULLISH", icon: "↗", description: "I expect a rise of more than 1%." },
  { direction: "NEUTRAL", icon: "→", description: "I expect a move within ±1%." },
  { direction: "BEARISH", icon: "↘", description: "I expect a fall of more than 1%." },
];

export default function Briefing() {
  const { game, busy, act } = useGame();
  const news = useGameResource(getNews);
  const navigate = useNavigate();
  if (!game) return null;
  if (game.phase !== "BRIEFING" && game.phase !== "TRADING") return <Navigate to={gamePath(game)} replace />;
  return <><div className="eyebrow">ANNOUNCEMENTS · DAY {game.day}</div><h1>First, read the room.</h1>
    {news.loading ? <p role="status">Loading today's briefing…</p> : news.error ? <p role="alert">{news.error} <button onClick={news.reload}>Retry</button></p> : news.data && <>
      <article className="card news-card"><span className="tag">FOCUS · {news.data.focusStockId}</span>
        <h2>{news.data.headline}</h2><p>News influences investor decisions. The crowd, momentum and a little noise determine the price.</p></article>
      <h2>Your call: where will {news.data.focusStockId} close?</h2>
      <div className="card-grid prediction-grid">{choices.map((choice) => <button key={choice.direction}
        className={`card prediction ${game.prediction?.direction === choice.direction ? "selected" : ""}`}
        aria-pressed={game.prediction?.direction === choice.direction} disabled={busy}
        onClick={() => void act({ type: "prediction", input: { direction: choice.direction } })}>
        <span className="prediction-icon">{choice.icon}</span><strong>{choice.direction}</strong><span>{choice.description}</span>
      </button>)}</div>
      <p className="muted" aria-live="polite">{game.prediction ? `Saved: ${game.prediction.direction}. You can change this until the day closes.` : "Choose now or return before End Day. You can trade without a prediction."}</p>
      <div className="actions"><button className="primary" disabled={busy} onClick={async () => {
        if (game.phase === "TRADING") { navigate("/Market"); return; }
        const opened = await act({ type: "open-market" }); if (opened) navigate(gamePath(opened));
      }}>{game.phase === "TRADING" ? "Back to Market →" : "Open the Market →"}</button></div>
    </>}<EndDayButton /></>;
}
