import { Link, useNavigate } from "react-router-dom";
import { useGame } from "../hooks/game-context";
import { gamePath, money } from "../lib/format";
import ChibiSprite from "../components/pixel/ChibiSprite";
import SceneStage from "../components/scene/SceneStage";

export default function Home() {
  const { game, session, loading, busy, start, refresh } = useGame();
  const navigate = useNavigate();
  return <main className="game-viewport title-screen">
    <SceneStage src="/art/bedroom.png" width={1672} height={941} focusX={50} alt="Your finance bro's pixel apartment in the morning" />
    <section className="title-menu">
      <span className="eyebrow">A FINANCE BRO LIFE SIM</span>
      <ChibiSprite size={164} animation="idle" label="Your chibi finance bro" />
      <h1 className="hero-title">BULLISH<span>!</span></h1>
      <p className="intro">Morning call. Market moves.<br />Three days. Three stocks. <span className="numeric">£10,000</span> to make your name.</p>
      <div className="actions">{loading ? <p role="status">Loading your session…</p> : game ?
        <Link className="button primary" to={gamePath(game)}>Continue Day {game.day} →</Link>
        : session ? <button disabled={busy} onClick={() => void refresh()}>Reload saved game</button>
          : <button className="primary" disabled={busy} onClick={async () => {
            const created = await start(); if (created) navigate("/WakeUp");
          }}>{busy ? "Starting…" : "Start your run →"}</button>}</div>
      {game && <p>Saved wealth <span className="numeric">{money(game.netWorthPence)}</span></p>}
      <details><summary>How to play</summary><p>Click your bed to wake up. Your phone shows stock news. Choose Stocks, Arbitrage or Bank from the screen options, and tap your profile for your portfolio. Save a prediction in Stocks, go to bed to close the day, then wake up for the next morning.</p></details>
    </section>
  </main>;
}
