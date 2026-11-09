import type { AgentGroup, InvestorActivityDTO, LeaderboardDTO } from "@bullish/shared";
import { money, percent } from "../lib/format";

const groupNames: Record<AgentGroup, string> = {
  OPTIMIST: "Optimist", PESSIMIST: "Pessimist", FOMO: "FOMO trader",
  PANIC: "Panic trader", LONG_TERM: "Long-term investor", ANALYST: "Analyst",
};

function activityLabel(action: InvestorActivityDTO) {
  switch (action.type) {
    case "BUY": return `Bought ${action.quantity} ${action.stockId} shares for ${money(action.amountPence)}`;
    case "SELL": return `Sold ${action.quantity} ${action.stockId} shares for ${money(action.amountPence)}`;
    case "DEPOSIT": return `Saved ${money(action.amountPence)}`;
    case "WITHDRAW": return `Withdrew ${money(action.amountPence)} from savings`;
    case "BORROW": return `Borrowed ${money(action.amountPence)}`;
    case "REPAY": return `Repaid ${money(action.amountPence)} of debt`;
    case "ARBITRAGE": return `Earned ${money(action.amountPence)} from arbitrage`;
    case "SAVINGS_INTEREST": return `Earned ${money(action.amountPence)} in savings interest`;
    case "LOAN_INTEREST": return `Charged ${money(action.amountPence)} in loan interest`;
    case "LOAN_PENALTY": return `Charged ${money(action.amountPence)} on overdue debt`;
  }
}

export default function WealthBoard({ board }: { board: LeaderboardDTO }) {
  return <section className="wealth-board" aria-label="Wealth leaderboard">
    <div className="card-grid leaderboard-summary">
      <article className="card"><h2>Your rank</h2><p className="stock-price numeric">#{board.player.rank} <small>/ {board.totalParticipants}</small></p></article>
      <article className="card"><h2>Your net wealth</h2><p className="stock-price">{money(board.player.netWorthPence)}</p>
        <span className={board.player.returnPct >= 0 ? "positive" : "negative"}>{percent(board.player.returnPct)} since the start</span></article>
    </div>
    <div className="table-wrap"><table className="leaderboard-table">
      <caption>Top 10 by net wealth · Day {board.day}</caption>
      <thead><tr><th scope="col">Rank</th><th scope="col">Investor</th><th scope="col">Net wealth</th><th scope="col">Return</th></tr></thead>
      <tbody>{board.entries.map((entry) => <tr key={entry.id} className={entry.isPlayer ? "leaderboard-player" : undefined}>
        <td className="numeric">#{entry.rank}</td>
        <th scope="row"><span>{entry.name} {entry.isPlayer && <span className="tag">YOU</span>}</span>
          <span className="leaderboard-strategy muted">{entry.group ? groupNames[entry.group] : "Your portfolio"}</span>
          <details className="leaderboard-details"><summary>Assets &amp; activity</summary>
            <dl className="leaderboard-breakdown">
              <div><dt>Cash</dt><dd>{money(entry.cashPence)}</dd></div>
              <div><dt>Savings</dt><dd>{money(entry.savingsPence)}</dd></div>
              <div><dt>Shares</dt><dd>{money(entry.stockValuePence)}</dd></div>
              <div><dt>Total assets</dt><dd>{money(entry.grossAssetsPence)}</dd></div>
              <div><dt>Debt</dt><dd className={entry.debtPence > 0 ? "negative" : undefined}>{money(entry.debtPence)}</dd></div>
            </dl>
            {entry.lastActions.length > 0 && <><p>Last settled activity</p>
              <ul>{entry.lastActions.map((action, index) => <li key={index}>{activityLabel(action)}</li>)}</ul></>}
          </details>
        </th>
        <td className="numeric">{money(entry.netWorthPence)}</td>
        <td className={`numeric ${entry.returnPct >= 0 ? "positive" : "negative"}`}>{percent(entry.returnPct)}</td>
      </tr>)}</tbody>
    </table></div>
    {!board.entries.some((entry) => entry.isPlayer) && <p className="leaderboard-own-rank">You are <strong>#{board.player.rank}</strong> of {board.totalParticipants},
      with <strong className="numeric">{money(board.player.netWorthPence)}</strong> net wealth.</p>}
    <p className="muted leaderboard-note">Net wealth = cash + savings + shares − debt. Equal wealth shares a rank.</p>
  </section>;
}
