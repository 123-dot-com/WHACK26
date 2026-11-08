import { Link } from "react-router-dom";
import { useState } from "react";
import { useGame } from "../../hooks/game-context";
import { money } from "../../lib/format";
import ChibiSprite from "../pixel/ChibiSprite";
import PixelIcon from "../pixel/PixelIcon";

export default function GameHUD({ title, onRestart, restartDisabled = false, profileDisabled = false, night = false }: {
  title: string; onRestart: () => void; restartDisabled?: boolean; profileDisabled?: boolean; night?: boolean;
}) {
  const { game } = useGame();
  const [fullscreenError, setFullscreenError] = useState(false);
  if (!game) return null;
  return <header className="game-hud">
    <div className="hud-location"><Link className="hud-brand" to="/">BULLISH!</Link><span><PixelIcon name={night ? "moon" : "sun"} /> {night ? "NIGHT" : "MORNING"} · DAY <b className="numeric">{game.day}/3</b></span><span className="hud-location-name">{title}</span></div>
    <dl className="hud-balances"><div><dt><PixelIcon name="coin" /> Cash</dt><dd>{money(game.wallet.cashPence)}</dd></div>
      <div><dt><PixelIcon name="bank" /> Savings</dt><dd>{money(game.wallet.savingsPence)}</dd></div>
      <div><dt><PixelIcon name="bag" /> Wealth</dt><dd>{money(game.netWorthPence)}</dd></div></dl>
    <div className="hud-controls">
      <button className="hud-restart" disabled={restartDisabled} onClick={onRestart} aria-label="Restart game" title="Restart game"><PixelIcon name="restart" /><span>Restart</span></button>
      <button className="hud-fullscreen" aria-label="Toggle fullscreen" title="Fullscreen" onClick={async () => {
        try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); }
        catch { setFullscreenError(true); }
      }}>⛶</button>
      <Link className="hud-profile" to="/Portfolio" aria-label="Open portfolio" aria-disabled={profileDisabled}
        onClick={(event) => { if (profileDisabled) event.preventDefault(); }}><ChibiSprite size={58} /><span>PROFILE</span></Link>
    </div>
    {fullscreenError && <button className="fullscreen-feedback" onClick={() => setFullscreenError(false)}>Fullscreen is unavailable here. The game still fills your browser.</button>}
  </header>;
}
