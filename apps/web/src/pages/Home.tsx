import { Link, useNavigate } from "react-router-dom";
import Header from "../assets/Header";
import { useGame } from "../hooks/game-context";
import { gamePath, money } from "../lib/format";
import ChibiSprite from "../components/pixel/ChibiSprite";
import PixelIcon from "../components/pixel/PixelIcon";

export default function Home() {
  const { game, session, loading, busy, start, refresh } = useGame();
  const navigate = useNavigate();
  return <><Header /><main className="page home-page">
    <div className="eyebrow">A TINY FINANCE BRO. A BIG NEW DAY.</div>
    <div className="home-character"><span className="home-spark home-spark--one"><PixelIcon name="star" /></span>
      <ChibiSprite size={208} label="Your animated pixel chibi finance bro" />
      <span className="home-spark home-spark--two"><PixelIcon name="coin" /></span><span className="home-character__shadow" /></div>
    <h1 className="hero-title">BULLISH<span>!</span></h1>
    <p className="intro">Wake up. Check your phone. Make your moves.<br />Three days and £10,000 in fictional money.</p>
    <div className="actions">{loading ? <p role="status">Loading your session…</p> : game ?
      <Link className="button primary" to={gamePath(game)}>Continue Day {game.day} →</Link>
      : session ? <button disabled={busy} onClick={() => void refresh()}>Reload saved game</button>
        : <button className="primary" disabled={busy} onClick={async () => {
          const created = await start(); if (created) navigate("/WakeUp");
        }}>{busy ? "Starting…" : "Start your run →"}</button>}</div>
    {game && <p className="muted">Your saved run · {money(game.netWorthPence)} net worth</p>}
    <section id="how-to-play" className="how-to-play"><h2>A little daily routine.</h2>
      <div className="card-grid"><article className="card"><PixelIcon name="phone" /><h3>01 · Check your phone</h3><p>Read the announcement and predict what happens next.</p></article>
        <article className="card"><PixelIcon name="market" /><h3>02 · Tap an app</h3><p>Trade stocks, try arbitrage, or stop by the bank.</p></article>
        <article className="card"><PixelIcon name="moon" /><h3>03 · Call it a day</h3><p>See how it went. Wake up and do it all again.</p></article></div>
    </section><p className="disclaimer">A WHACK project by the BULLISH! team. Fictional money and companies; an educational game.</p>
  </main></>;
}
