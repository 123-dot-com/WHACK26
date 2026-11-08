import { Link, Navigate, Outlet, useNavigate } from "react-router-dom";
import GameHeader from "../assets/GameHeaders";
import { useGame } from "../hooks/game-context";
import { money } from "../lib/format";
import PixelIcon from "./pixel/PixelIcon";
import ChibiSprite from "./pixel/ChibiSprite";

export default function GameLayout() {
  const { game, session, loading, busy, act, refresh } = useGame();
  const navigate = useNavigate();
  if (loading && !game) return <main className="page" role="status">Loading your game…</main>;
  if (!game && session) return <main className="page"><h1>Could not load your game</h1>
    <button onClick={() => void refresh()}>Try loading again</button> <Link to="/">Home</Link></main>;
  if (!game) return <Navigate to="/" replace />;
  return <div className="game-shell"><GameHeader />
    <div className="session-bar"><span className="day-label">DAY {game.day} / 3 <span className="phase-label">{game.phase}</span></span>
      <dl><div><dt><PixelIcon name="coin" /> Current Cash</dt><dd>{money(game.wallet.cashPence)}</dd></div>
        <div><dt><PixelIcon name="bank" /> Savings</dt><dd>{money(game.wallet.savingsPence)}</dd></div>
        <div><dt><PixelIcon name="bag" /> Net Worth</dt><dd>{money(game.netWorthPence)}</dd></div></dl>
      <button className="quiet" disabled={busy || loading} onClick={() => void refresh()}>Refresh</button></div>
    {game.phase === "REPORT" && <div className="phase-notice">Day {game.day} is closed. <Link to="/DailyReport">Read your report →</Link></div>}
    {game.phase === "FINISHED" && <div className="phase-notice">Your three-day run is complete. <Link to="/FinalReport">See your final report →</Link></div>}
    <div className="phone-content"><div className="phone-status" aria-hidden="true"><PixelIcon name="phone" /><span>FINANCE BRO'S PHONE</span><span className="battery-icon" /></div>
      <main className="page" aria-busy={busy}><Outlet /></main>
      <div className="phone-home-indicator" aria-hidden="true" />
    </div>
    <div className="phone-companion" aria-hidden="true"><ChibiSprite size={144} animation={game.phase === "FINISHED" || game.phase === "REPORT" ? "cheer" : "phone"} /></div>
    <footer className="game-footer"><span>Fictional markets. Real lessons.</span>
      {game.phase === "FINISHED" ? <Link to="/FinalReport">Final report</Link> :
        <button className="quiet" disabled={busy} onClick={async () => {
          const updated = await act({ type: "reset" }); if (updated) navigate("/WakeUp");
        }}>Reset this run</button>}
    </footer></div>;
}
