import { Link } from "react-router-dom";
import { useGame } from "../hooks/game-context";
import { money, signedMoney } from "../lib/format";

export default function Portfolio() {
  const { game } = useGame();
  if (!game) return null;
  const equity = game.stocks.reduce((sum, stock) => sum + stock.quantityHeld * stock.pricePence, 0);
  const pnl = game.netWorthPence - 1_000_000;
  return <><div className="eyebrow">YOUR PORTFOLIO</div><h1>Where you stand.</h1>
    <div className="card-grid"><article className="card"><h2>Total wealth</h2><p className="stock-price">{money(game.netWorthPence)}</p></article>
      <article className="card"><h2>Since the start</h2><p className={`stock-price ${pnl >= 0 ? "positive" : "negative"}`}>{signedMoney(pnl)}</p></article>
      <article className="card"><h2>Stock exposure</h2><p className="stock-price">{game.netWorthPence ? (equity / game.netWorthPence * 100).toFixed(1) : "0"}%</p></article></div>
    <div className="table-wrap"><table><caption>Your stock holdings</caption><thead><tr><th>Stock</th><th>Shares</th><th>Current price</th><th>Value</th></tr></thead>
      <tbody>{game.stocks.map((stock) => <tr key={stock.id}><th scope="row">{stock.id} <span className="muted">{stock.name}</span></th>
        <td>{stock.quantityHeld}</td><td>{money(stock.pricePence)}</td><td>{money(stock.pricePence * stock.quantityHeld)}</td></tr>)}</tbody></table></div>
    <p className="muted">Net Worth = Current Cash + Savings + current value of your shares.</p>
    {game.phase === "TRADING" && <div className="actions"><Link className="button" to="/Market">Back to Market</Link></div>}</>;
}
