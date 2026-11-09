import { getLeaderboard } from "../api/client";
import WealthBoard from "../components/WealthBoard";
import { useGameResource } from "../hooks/use-game-resource";

export default function Leaderboard() {
  const ranking = useGameResource(getLeaderboard);
  return <><div className="eyebrow">YOU AND THE MARKET CROWD</div><h1>Wealth leaderboard</h1>
    <p>Everyone starts with £10,000. Compete with 100 bots using trading, savings, loans and arbitrage.</p>
    {ranking.loading ? <p role="status">Loading the wealth rankings…</p> : ranking.error ?
      <p role="alert">{ranking.error} <button onClick={ranking.reload}>Retry rankings</button></p> : ranking.data && <>
        <p className="muted">{ranking.data.settledDay === 0 ? "Starting standings. Bots make their first moves at the end of Day 1."
          : `Bots act at day close; settled through Day ${ranking.data.settledDay}. Your wealth reflects your latest actions.`}</p>
        <WealthBoard board={ranking.data} />
      </>}
  </>;
}
