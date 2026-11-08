import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import ReportDetails from "../components/ReportDetails";
import { useGame } from "../hooks/game-context";
import { gamePath } from "../lib/format";

export default function DailyReport() {
  const { game, busy, act } = useGame();
  const [selectedDay, setSelectedDay] = useState(0);
  const navigate = useNavigate();
  if (!game) return null;
  const report = game.reports.find((item) => item.day === selectedDay) ?? game.reports.at(-1);
  if (!report) return <Navigate to={gamePath(game)} replace />;
  return <><div className="eyebrow">THE CLOSING BELL · DAY {report.day}</div><h1>Your decisions, settled.</h1>
    <nav className="report-tabs" aria-label="Report day">{game.reports.map((item) => <button key={item.day} aria-pressed={report.day === item.day}
      onClick={() => setSelectedDay(item.day)}>Day {item.day}</button>)}</nav>
    <ReportDetails report={report} />
    <div className="actions">{game.phase === "REPORT" && <button className="primary" disabled={busy} onClick={async () => {
      const next = await act({ type: "next-day" }); if (next) navigate("/WakeUp");
    }}>Start Day {game.day + 1} →</button>}
      {game.phase === "FINISHED" && <Link className="button primary" to="/FinalReport">Your final report →</Link>}
      {game.phase === "TRADING" && <Link className="button" to="/Market">Back to Market</Link>}</div>
  </>;
}
