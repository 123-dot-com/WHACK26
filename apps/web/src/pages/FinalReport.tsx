import { Link, Navigate, useNavigate } from "react-router-dom";
import { useGame } from "../hooks/game-context";
import { gamePath, money, signedMoney } from "../lib/format";
import WealthBoard from "../components/WealthBoard";

export default function FinalReport() {
  const { game, busy, act } = useGame();
  const navigate = useNavigate();
  if (!game) return null;
  if (game.phase !== "FINISHED") return <Navigate to={gamePath(game)} replace />;
  const correct = game.reports.filter((report) => report.prediction.correct).length;
  const pnl = game.netWorthPence - 1_000_000;
  const market = game.reports.reduce((sum, report) => sum + report.marketPnlPence, 0);
  const interest = game.reports.reduce((sum, report) => sum + report.interestPence, 0);
  const arbitrage = game.reports.reduce((sum, report) => sum + report.arbitragePnlPence, 0);
  const loanInterest = game.reports.reduce((sum, report) => sum + (report.loanInterestPence ?? 0), 0);
  const debt = game.loan?.active?.balancePence ?? 0;
  return <><div className="eyebrow">THREE DAYS. YOUR STORY.</div><h1>That's a wrap, finance bro.</h1>
    <div className="card-grid"><article className="card"><h2>Final wealth</h2><p className="stock-price">{money(game.netWorthPence)}</p><p>Started with £10,000.00</p></article>
      <article className="card"><h2>Total return</h2><p className={`stock-price ${pnl >= 0 ? "positive" : "negative"}`}>{signedMoney(pnl)}</p><p>{(pnl / 10_000).toFixed(2)}% over three days</p></article>
      <article className="card"><h2>Predictions</h2><p className="stock-price">{correct} / 3</p><p>Direction calls are separate from profit.</p></article></div>
    <section className="card"><h2>What drove your result?</h2><dl className="preview"><div><dt>Market P&amp;L</dt><dd>{signedMoney(market)}</dd></div>
      <div><dt>Savings interest</dt><dd>{signedMoney(interest)}</dd></div><div><dt>Arbitrage P&amp;L</dt><dd>{signedMoney(arbitrage)}</dd></div>
      <div><dt>Loan interest</dt><dd>{signedMoney(-loanInterest)}</dd></div></dl>
      {debt > 0 && <p>Outstanding loan debt: <strong className="numeric negative">{money(debt)}</strong>, already deducted from final wealth.</p>}</section>
    <div className="table-wrap"><table><caption>Your three-day track record</caption><thead><tr><th>Day</th><th>Your call</th><th>Actual</th><th>Result</th><th>Stock exposure at close</th></tr></thead>
      <tbody>{game.reports.map((report) => <tr key={report.day}><th scope="row">Day {report.day}</th><td>{report.prediction.chosen}</td><td>{report.prediction.actual}</td>
        <td>{report.prediction.correct ? "Correct" : "Incorrect"}</td><td>{report.exposurePct.toFixed(1)}%</td></tr>)}</tbody></table></div>
    {game.reports[2]?.leaderboard && <><h2>Final wealth ranking</h2><WealthBoard board={game.reports[2].leaderboard} /></>}
    <section className="card lesson"><span className="eyebrow">TAKE IT WITH YOU</span><h2>Good decisions need more than a good headline.</h2>
      <p>News, momentum and investor behaviour can push prices in different directions. Your exposure determined how much those moves affected your wealth. Savings earned steady interest; arbitrage rewarded checking both sides of a trade.</p>
      <p>Lower exposure is not automatically better. Think about the return you earned, the risk you took and the cash you kept available.</p></section>
    <div className="actions"><button className="primary" disabled={busy} onClick={async () => {
      const restarted = await act({ type: "reset" }); if (restarted) navigate("/WakeUp");
    }}>Play the same scenario again →</button><Link className="button" to="/DailyReport">Explore daily reports</Link></div>
  </>;
}
