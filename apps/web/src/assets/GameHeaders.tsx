import { Link, NavLink, useNavigate } from "react-router-dom";
import { useGame } from "../hooks/game-context";
import ChibiSprite from "../components/pixel/ChibiSprite";
import PixelIcon, { type PixelIconName } from "../components/pixel/PixelIcon";

const appIcons: Record<string, PixelIconName> = { Briefing: "newspaper", Market: "market", Bank: "bank", Arbitrage: "oil", DailyReport: "flag", FinalReport: "star" };

export default function GameHeaders() {
  const { game, busy, act } = useGame();
  const navigate = useNavigate();
  const tabs = game?.phase === "TRADING" || game?.phase === "BRIEFING"
    ? ["Briefing", "Market", "Arbitrage", "Bank", ...(game.reports.length ? ["DailyReport"] : [])]
    : ["DailyReport", ...(game?.phase === "FINISHED" ? ["FinalReport"] : [])];
  return <>
    <header className="site-header"><Link className="logo" to="/">BULLISH! <span>↗</span></Link>
      <span className="header-day"><PixelIcon name="sun" /> DAY {game?.day} / 3</span>
      <Link className="profile-button" to="/Portfolio" aria-label="Open portfolio" title="Your portfolio">
        <ChibiSprite size={64} animation={game?.phase === "FINISHED" ? "cheer" : "idle"} /><span>PROFILE</span>
      </Link>
    </header>
    <nav className="app-dock" aria-label="Phone apps">{tabs.map((tab) => <NavLink key={tab} to={`/${tab}`}
      aria-disabled={busy} onClick={async (event) => {
        if (busy) { event.preventDefault(); return; }
        if (game?.phase === "BRIEFING" && ["Market", "Arbitrage", "Bank"].includes(tab)) {
          event.preventDefault();
          const opened = await act({ type: "open-market" }); if (opened) navigate(`/${tab}`);
        }
      }}>
      <span className={`app-dock__icon app-dock__icon--${tab.toLowerCase()}`}><PixelIcon name={appIcons[tab]} /></span>
      <span>{tab === "Briefing" ? "News" : tab === "Market" ? "Stocks" : tab.replace(/([a-z])([A-Z])/g, "$1 $2")}</span>
    </NavLink>)}</nav>
  </>;
}
