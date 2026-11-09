import { getLeaderboard } from "../api/client";
import WealthBoard from "../components/WealthBoard";
import { useGameResource } from "../hooks/use-game-resource";
import { Navigate } from "react-router-dom";
import { useGame } from "../hooks/game-context";

export default function Leaderboard() {
  const { game } = useGame();
  if (!game) return null;
  if (game.phase !== "FINISHED" || game.day !== 3) return <Navigate to="/Room" replace />;
  return <FinalRanking />;
}

function FinalRanking() {
  const ranking = useGameResource(getLeaderboard);
  return <><div className="eyebrow">THREE DAYS. THE FINAL STANDINGS.</div><h1>Final wealth leaderboard</h1>
    <p>Everyone starts with £10,000. Compete with 100 bots using trading, savings, loans and arbitrage.</p>
    {ranking.loading ? <p role="status">Loading the wealth rankings…</p> : ranking.error ?
      <p role="alert">{ranking.error} <button onClick={ranking.reload}>Retry rankings</button></p> : ranking.data && <>
        <p className="muted">All three days are complete. These are the final wealth rankings.</p>
        <WealthBoard board={ranking.data} />
      </>}
  </>;
}
