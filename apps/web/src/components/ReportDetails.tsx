import type { DailyReportDTO } from "@bullish/shared";
import { money, percent, signedMoney } from "../lib/format";

export default function ReportDetails({ report }: { report: DailyReportDTO }) {
  return <>
    <div className="card-grid report-totals"><article className="card"><h3>Market P&amp;L</h3><p className={report.marketPnlPence >= 0 ? "positive" : "negative"}>{signedMoney(report.marketPnlPence)}</p></article>
      <article className="card"><h3>Savings interest</h3><p className="positive">{signedMoney(report.interestPence)}</p></article>
      <article className="card"><h3>Arbitrage P&amp;L</h3><p className={report.arbitragePnlPence >= 0 ? "positive" : "negative"}>{signedMoney(report.arbitragePnlPence)}</p></article></div>
    <section className="card prediction-result"><div><h2>{report.prediction.correct ? "You read it right." : "The market had other plans."}</h2>
      <p>{report.prediction.stockId}: your call <strong>{report.prediction.chosen}</strong> · actual <strong>{report.prediction.actual}</strong></p></div>
      <span className="tag">{report.prediction.correct ? "CORRECT" : "INCORRECT"}</span></section>
    <h2>Meet the closing crowd.</h2><p className="muted">Each square is one virtual investor. BUY, SELL and HOLD votes sum to 100 for each stock.</p>
    <div className="card-grid">{report.marketResults.map((result) => <article className="card market-result" key={result.stockId}>
      <div className="stock-heading"><h3>{result.stockId}</h3><strong className={result.returnPct >= 0 ? "positive" : "negative"}>{percent(result.returnPct)}</strong></div>
      <p>{money(result.previousPricePence)} → <strong>{money(result.nextPricePence)}</strong></p>
      <div className="crowd-grid" role="img" aria-label={`${result.buyCount} buy, ${result.sellCount} sell, ${result.holdCount} hold`}>
        {Array.from({ length: 100 }, (_, index) => <i aria-hidden="true" key={index} className={index < result.buyCount ? "buy" : index < result.buyCount + result.sellCount ? "sell" : "hold"} />)}</div>
      <p className="vote-legend"><span>BUY {result.buyCount}</span><span>SELL {result.sellCount}</span><span>HOLD {result.holdCount}</span></p>
      <p className="explanation">{result.explanation}</p>
      <details><summary>See all six investor groups</summary><dl className="group-votes">{Object.entries(result.byGroup).map(([group, votes]) =>
        <div key={group}><dt>{group.replaceAll("_", " ")}</dt><dd>{votes.buy} BUY · {votes.sell} SELL · {votes.hold} HOLD</dd></div>)}</dl></details>
    </article>)}</div>
    <section className="card lesson"><span className="eyebrow">TODAY'S TAKEAWAY</span><h2>{report.takeaway}</h2>
      <p>Stock exposure before close: {report.exposurePct.toFixed(1)}% · Closing wealth: {money(report.netWorthPence)}</p></section>
  </>;
}
