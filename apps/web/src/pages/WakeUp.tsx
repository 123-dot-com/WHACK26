import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import ChibiSprite from "../components/pixel/ChibiSprite";
import PixelIcon from "../components/pixel/PixelIcon";
import { useGame } from "../hooks/game-context";
import { gamePath } from "../lib/format";

export default function WakeUp() {
  const { game, loading, session } = useGame();
  const [stage, setStage] = useState<"sleep" | "wake" | "phone">("sleep");
  const navigate = useNavigate();

  useEffect(() => {
    if (!game || game.phase !== "BRIEFING") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      navigate("/Briefing", { replace: true }); return;
    }
    const timers = [setTimeout(() => setStage("wake"), 1500),
      setTimeout(() => setStage("phone"), 2800),
      setTimeout(() => navigate("/Briefing", { replace: true }), 4200)];
    return () => timers.forEach(clearTimeout);
  }, [game, navigate]);

  if (loading && !game) return <main className="wake-screen" role="status">Waking up…</main>;
  if (!game) return <main className="wake-screen"><p>{session ? "Could not load your game. Return home to try again." : "Start a run to meet your finance bro."}</p><Link to="/">Back home</Link></main>;
  if (game.phase !== "BRIEFING") return <Navigate to={gamePath(game)} replace />;

  return <main className={`wake-screen wake-screen--${stage}`}>
    <span className="eyebrow">DAY {game.day} OF 3 · A NEW MORNING</span>
    <h1>{stage === "sleep" ? "Just five more minutes…" : stage === "wake" ? "Rise and shine, finance bro." : "A little news before the big moves."}</h1>
    <div className="bedroom-vignette" aria-label={stage === "sleep" ? "Your chibi character is asleep in bed" : stage === "wake" ? "Your chibi character wakes up" : "Your chibi character picks up a phone"} role="img">
      <div className="bedroom-window"><span /><span /><span /><span /></div>
      <div className="bed"><div className="bed-pillow" /><div className="bed-blanket" /><div className="bed-leg bed-leg--left" /><div className="bed-leg bed-leg--right" /></div>
      <div className="wake-character"><ChibiSprite animation={stage === "phone" ? "phone" : stage === "wake" ? "walk" : "idle"}
        size={196} paused={stage === "sleep"} frame={2} /></div>
      <div className="bedside-table"><PixelIcon name="phone" /></div>
      {stage === "sleep" && <span className="sleep-letters" aria-hidden="true">z<span>z</span><span>Z</span></span>}
      {stage === "phone" && <span className="phone-notification"><PixelIcon name="newspaper" /> Morning announcement!</span>}
    </div>
    <p className="wake-caption" role="status">{stage === "sleep" ? "The market can wait a second." : stage === "wake" ? "New day. Same ambitious little guy." : "Opening your phone…"}</p>
    <button className="quiet" onClick={() => navigate("/Briefing", { replace: true })}>Skip intro →</button>
  </main>;
}
