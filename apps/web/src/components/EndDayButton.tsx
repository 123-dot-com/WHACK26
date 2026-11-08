import { Link, useNavigate } from "react-router-dom";
import { useGame } from "../hooks/game-context";
import { gamePath } from "../lib/format";

export default function EndDayButton() {
  const { game, busy, act } = useGame();
  const navigate = useNavigate();
  if (game?.phase !== "TRADING") return null;
  return <section className="close-day"><div><h2>Ready for the closing bell?</h2>
    <p>{game.prediction ? "All done? Close your phone and see how the day went." : <>Save a <Link to="/Briefing">prediction in News</Link> before closing the day.</>}</p></div>
    <button className="primary" disabled={busy || !game.prediction} onClick={async () => {
      const closed = await act({ type: "end-day" }); if (closed) navigate(gamePath(closed));
    }}>End Day {game.day} →</button></section>;
}
