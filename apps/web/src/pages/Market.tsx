import { Navigate } from "react-router-dom";
import EndDayButton from "../components/EndDayButton";
import TradeCard from "../components/TradeCard";
import { useGame } from "../hooks/game-context";
import { gamePath } from "../lib/format";

export default function Market() {
  const { game } = useGame();
  if (!game) return null;
  if (game.phase !== "TRADING") return <Navigate to={gamePath(game)} replace />;
  return <><div className="eyebrow">THE MARKET IS OPEN</div><h1>Make your moves.</h1>
    <p className="intro">Buy, sell, or hold your cash. Prices move when you end the day.</p>
    <div className="card-grid">{game.stocks.map((stock) => <TradeCard key={stock.id} stock={stock} />)}</div>
    <p className="muted">Whole shares only. No short selling, margin or trading fees.</p><EndDayButton /></>;
}
