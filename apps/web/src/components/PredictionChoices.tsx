import type { PredictionDirection } from "@bullish/shared";
import { useGame } from "../hooks/game-context";
import { getNews } from "../api/client";
import { useGameResource } from "../hooks/use-game-resource";

const choices: Array<{ direction: PredictionDirection; icon: string; description: string }> = [
  { direction: "BULLISH", icon: "↗", description: "More than +1%" },
  { direction: "NEUTRAL", icon: "→", description: "Within ±1%" },
  { direction: "BEARISH", icon: "↘", description: "Less than −1%" },
];

export default function PredictionChoices() {
  const { game, busy, act } = useGame();
  const news = useGameResource(getNews);
  if (!game) return null;
  return <section className="stock-prediction"><h2>Your daily market call</h2>
    <p>{news.data ? "Where will " + news.data.focusStockId + " close?" : "Choose a direction for today's focus stock."} Save a prediction before going to bed.</p>
    <div className="card-grid prediction-grid">{choices.map((choice) => <button key={choice.direction}
      className={"card prediction " + (game.prediction?.direction === choice.direction ? "selected" : "")}
      aria-label={"Predict " + choice.direction}
      aria-pressed={game.prediction?.direction === choice.direction} disabled={busy}
      onClick={() => void act({ type: "prediction", input: { direction: choice.direction } })}>
      <span className="prediction-icon">{choice.icon}</span><strong>{choice.direction}</strong><span>{choice.description}</span></button>)}</div>
    <p className="muted" role="status">{game.prediction ? "Saved: " + game.prediction.direction : "No prediction saved yet. Trading is optional."}</p>
  </section>;
}
