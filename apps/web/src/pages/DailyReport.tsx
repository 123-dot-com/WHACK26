import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import ReportDetails from "../components/ReportDetails";
import { useGame } from "../hooks/game-context";
import { gamePath } from "../lib/format";

export default function DailyReport() {
  const { game } = useGame();
  const [selectedDay, setSelectedDay] = useState(0);
  if (!game) return null;
  const report = game.reports.find((item) => item.day === selectedDay) ?? game.reports.at(-1);
  if (!report) return <Navigate to={gamePath(game)} replace />;
  return <><div className="eyebrow">THE CLOSING BELL · DAY {report.day}</div><h1>Your decisions, settled.</h1>
    <nav className="report-tabs" aria-label="Report day">{game.reports.map((item) => <button key={item.day} aria-pressed={report.day === item.day}
      onClick={() => setSelectedDay(item.day)}>Day {item.day}</button>)}</nav>
    <ReportDetails report={report} />
    <div className="actions"><Link className="button primary" to="/Room">Back to bedroom</Link></div>
    {game.phase === "REPORT" && <p className="muted">The day is closed. Wake your character in bed when you're ready for the next morning.</p>}
  </>;
}
