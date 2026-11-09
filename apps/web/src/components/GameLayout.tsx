import { useEffect } from "react";
import { Link, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useGame } from "../hooks/game-context";
import { useDayCycle } from "../hooks/use-day-cycle";
import BedroomScene from "./scene/BedroomScene";
import GameHUD from "./scene/GameHUD";
import WorldOptions from "./scene/WorldOptions";
import StatusBanner from "./StatusBanner";
import PixelIcon from "./pixel/PixelIcon";

const titles: Record<string, string> = {
  "/Market": "Stocks", "/Arbitrage": "Arbitrage", "/Portfolio": "Portfolio",
  "/DailyReport": "Daily reports", "/FinalReport": "Final report",
  "/Leaderboard": "Wealth leaderboard",
};

export default function GameLayout() {
  const { game, session, loading, busy, refresh } = useGame();
  const cycle = useDayCycle();
  const location = useLocation();
  const navigate = useNavigate();
  const isBank = location.pathname === "/Bank";
  const isRoom = location.pathname === "/Room";
  const isPhone = location.pathname === "/Briefing";
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isBank && !isRoom) navigate("/Room");
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [isBank, isRoom, navigate]);
  if (loading && !game) return <main className="game-viewport scene-loading" role="status">Loading your game…</main>;
  if (!game && session) return <main className="game-viewport scene-loading"><h1>Could not load your game</h1>
    <button onClick={() => void refresh()}>Try again</button><Link to="/">Home</Link></main>;
  if (!game) return <Navigate to="/" replace />;
  return <div className="game-viewport" data-time={cycle.night ? "night" : "morning"} data-room-state={cycle.sleeping ? "asleep" : "awake"}>
    {isBank ? <Outlet /> : <BedroomScene awake={!cycle.sleeping} night={cycle.night} busy={busy} settling={cycle.settling}
      phoneInHand={isPhone} onWake={() => void cycle.wakeUp()} onSleep={() => void cycle.goToSleep()} onPhone={() => navigate("/Briefing")} />}
    <GameHUD title={isBank ? "BULLISH PRIVATE BANK" : "THE APARTMENT"} night={cycle.night}
      onRestart={() => void cycle.restart()} restartDisabled={cycle.settling || busy}
      profileDisabled={cycle.sleeping || cycle.settling || busy} />
    <WorldOptions canAct={cycle.canAct} sleeping={cycle.sleeping} />
    {cycle.message && <div className="bed-feedback" role="alert"><span>{cycle.message}</span>
      <button onClick={() => cycle.dismissMessage()} aria-label="Dismiss bed message">×</button></div>}
    {!isBank && !isRoom && (isPhone ?
      <section className="news-phone" aria-label="Stock news phone">
        <div className="phone-status"><span className="numeric">{cycle.night ? "22:30" : "09:41"}</span><span className="phone-camera" /><span className="battery-icon" /></div>
        <div className="phone-heading"><span><PixelIcon name="newspaper" /> BULLISH WIRE</span>
          <button className="close-button" aria-label="Put phone away" onClick={() => navigate("/Room")}>×</button></div>
        <div className="phone-scroll"><StatusBanner /><main className="page"><Outlet /></main></div>
        <span className="phone-home-indicator" aria-hidden="true" />
      </section> :
      <section className="activity-panel" aria-label={titles[location.pathname] ?? "Game activity"}>
        <header className="activity-panel__heading"><span>{titles[location.pathname]}</span>
          <button className="close-button" aria-label="Close activity" onClick={() => navigate("/Room")}>×</button></header>
        <div className="activity-panel__scroll"><StatusBanner /><main className="page" aria-busy={busy}><Outlet /></main></div>
      </section>)}
  </div>;
}
