import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { getPuzzle } from "../api/client";
import EndDayButton from "../components/EndDayButton";
import { useGame } from "../hooks/game-context";
import { useGameResource } from "../hooks/use-game-resource";
import { gamePath, money, signedMoney } from "../lib/format";

export default function Arbitrage() {
  const { game, busy, act } = useGame();
  const resource = useGameResource(getPuzzle);
  const [route, setRoute] = useState<"BUY_BUNDLE_SELL_UNITS" | "BUY_UNITS_SELL_BUNDLE">("BUY_BUNDLE_SELL_UNITS");
  const [quantity, setQuantity] = useState("1");
  if (!game) return null;
  if (game.phase !== "TRADING") return <Navigate to={gamePath(game)} replace />;
  const puzzle = resource.data;
  const count = Number(quantity);
  const valid = /^\d+$/.test(quantity) && Number.isInteger(count) && count > 0 && count <= 2_147_483_647;
  const bundleFirst = route === "BUY_BUNDLE_SELL_UNITS";
  const cost = puzzle && valid ? count * (bundleFirst ? puzzle.bundleBuyPence : puzzle.unitBuyPence * puzzle.bundleSize) : 0;
  const revenue = puzzle && valid ? count * (bundleFirst ? puzzle.unitSellPence * puzzle.bundleSize : puzzle.bundleSellPence) : 0;
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (!puzzle || !valid) return;
    await act({ type: "arbitrage/execute", input: { puzzleId: puzzle.puzzleId, route, quantity: count } });
  };
  return <><div className="eyebrow">THE ARBITRAGE ROOM</div><h1>Spot the difference.</h1>
    <p className="intro">One attempt per day. Buy in one form, sell in another. Check both routes before you commit.</p>
    {resource.loading ? <p role="status">Loading today's prices…</p> : resource.error ? <p role="alert">{resource.error} <button onClick={resource.reload}>Retry</button></p> : puzzle && <>
      <div className="two-column"><article className="card"><span className="tag">1 UNIT</span><h2>Oil</h2><p className="buy-price">Buy {money(puzzle.unitBuyPence)}</p><p className="negative">Sell {money(puzzle.unitSellPence)}</p></article>
        <article className="card"><span className="tag">{puzzle.bundleSize} UNITS</span><h2>Sack of Oil</h2><p className="buy-price">Buy {money(puzzle.bundleBuyPence)}</p><p className="negative">Sell {money(puzzle.bundleSellPence)}</p></article></div>
      {game.arbitrage.completedToday ? <div className="card success" role="status">Today's attempt is complete. Come back next day for a new puzzle.</div> :
        <form className="card transfer-form" onSubmit={(event) => void submit(event)}><h2>Choose your route</h2>
          <label htmlFor="arbitrage-route">Route</label><select id="arbitrage-route" value={route} disabled={busy} onChange={(event) => setRoute(event.target.value as typeof route)}>
            <option value="BUY_BUNDLE_SELL_UNITS">Buy Sack → Sell 3 Oil</option><option value="BUY_UNITS_SELL_BUNDLE">Buy 3 Oil → Sell Sack</option></select>
          <label htmlFor="arbitrage-quantity">Number of bundles</label><input id="arbitrage-quantity" type="number" min="1" step="1" max="2147483647" value={quantity} disabled={busy} onChange={(event) => setQuantity(event.target.value)} required />
          <dl className="preview"><div><dt>Purchase cost</dt><dd>{valid ? money(cost) : "—"}</dd></div><div><dt>Sale revenue</dt><dd>{valid ? money(revenue) : "—"}</dd></div>
            <div><dt>Profit / loss</dt><dd className={revenue >= cost ? "positive" : "negative"}>{valid ? signedMoney(revenue - cost) : "—"}</dd></div></dl>
          <p className="muted">You need Current Cash to cover the full purchase cost. This settles immediately and uses today's only attempt.</p>
          <button className="primary" disabled={busy || !valid || cost > game.wallet.cashPence}>Execute this route</button></form>}
    </>}<EndDayButton /></>;
}
