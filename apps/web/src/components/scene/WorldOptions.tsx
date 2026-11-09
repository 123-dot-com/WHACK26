import { useLocation, useNavigate } from "react-router-dom";
import { useGame } from "../../hooks/game-context";
import PixelIcon, { type PixelIconName } from "../pixel/PixelIcon";

const activities: Array<{ label: string; path: string; icon: PixelIconName }> = [
  { label: "Stocks", path: "/Market", icon: "market" },
  { label: "Arbitrage", path: "/Arbitrage", icon: "oil" },
  { label: "Bank", path: "/Bank", icon: "bank" },
];

export default function WorldOptions({ canAct, sleeping }: { canAct: boolean; sleeping: boolean }) {
  const { game, busy, act } = useGame();
  const location = useLocation();
  const navigate = useNavigate();
  if (!game) return null;
  return <nav className="world-options" aria-label="Game activities">
    <button className={location.pathname === "/Room" ? "selected" : ""} onClick={() => navigate("/Room")}><PixelIcon name="moon" /><span>Room</span></button>
    {activities.map((item) => <button key={item.path} disabled={!canAct} aria-pressed={location.pathname === item.path}
      title={sleeping ? "Wake up before starting an activity" : item.label} onClick={async () => {
        if (!canAct) return;
        if (game.phase === "BRIEFING") { const opened = await act({ type: "open-market" }); if (!opened) return; }
        navigate(item.path);
      }}><PixelIcon name={item.icon} /><span>{item.label}</span></button>)}
    <button disabled={busy} aria-pressed={location.pathname === "/Leaderboard"}
      onClick={() => navigate("/Leaderboard")}><PixelIcon name="star" /><span>Ranking</span></button>
    {game.reports.length > 0 && <button disabled={busy} aria-pressed={location.pathname === "/DailyReport"}
      onClick={() => navigate("/DailyReport")}><PixelIcon name="flag" /><span>Reports</span></button>}
  </nav>;
}
