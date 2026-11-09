import { Navigate, Route, Routes } from "react-router-dom";
import GameProvider from "./components/GameProvider";
import GameLayout from "./components/GameLayout";
import StatusBanner from "./components/StatusBanner";
import Home from "./pages/Home";
import Briefing from "./pages/Briefing";
import Market from "./pages/Market";
import Portfolio from "./pages/Portfolio";
import Bank from "./pages/Bank";
import Arbitrage from "./pages/Arbitrage";
import DailyReport from "./pages/DailyReport";
import FinalReport from "./pages/FinalReport";
import Leaderboard from "./pages/Leaderboard";

export default function App() {
  return <GameProvider><StatusBanner />
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/WakeUp" element={<Navigate to="/Room" replace />} />
      <Route element={<GameLayout />}>
        <Route path="/Room" element={null} />
        <Route path="/Briefing" element={<Briefing />} />
        <Route path="/Market" element={<Market />} />
        <Route path="/Portfolio" element={<Portfolio />} />
        <Route path="/Bank" element={<Bank />} />
        <Route path="/Arbitrage" element={<Arbitrage />} />
        <Route path="/DailyReport" element={<DailyReport />} />
        <Route path="/FinalReport" element={<FinalReport />} />
        <Route path="/Leaderboard" element={<Leaderboard />} />
      </Route>
      <Route path="*" element={<main className="page"><h1>Page not found</h1><a href="/">Back to BULLISH!</a></main>} />
    </Routes>
  </GameProvider>;
}
