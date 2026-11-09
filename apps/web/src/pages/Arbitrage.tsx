import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { getArbitrageMarket } from "../api/client";
import { useGame } from "../hooks/game-context";
import { useGameResource } from "../hooks/use-game-resource";
import { gamePath } from "../lib/format";
import SceneStage from "../components/scene/SceneStage";
import ChibiSprite from "../components/pixel/ChibiSprite";
import StatusBanner from "../components/StatusBanner";
import MarketStall, { type StallDraft } from "../components/market/MarketStall";

export default function Arbitrage() {
  const { game, busy, act } = useGame();
  const navigate = useNavigate();
  const resource = useGameResource(getArbitrageMarket);
  const [stage, setStage] = useState<"outside" | "walking" | "inside">(() =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "inside" : "outside");
  const [selected, setSelected] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, StallDraft>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const walking = setTimeout(() => setStage((current) => current === "outside" ? "walking" : current), 180);
    const arrive = setTimeout(() => setStage("inside"), 1850);
    return () => { clearTimeout(walking); clearTimeout(arrive); };
  }, []);
  useEffect(() => { setSelected(0); }, [game?.day]);
  useEffect(() => { scrollRef.current?.scrollTo({ top: 0 }); }, [selected]);
  if (!game) return null;
  if (game.phase !== "TRADING") return <Navigate to={gamePath(game)} replace />;
  const puzzle = resource.data?.stalls[selected];
  const changeStall = (direction: number) => setSelected((current) => (current + direction + 3) % 3);
  return <>
    <SceneStage src={stage === "inside" ? "/art/trading-market-interior.svg" : "/art/trading-market-exterior.svg"}
      width={1536} height={1024} alt={stage === "inside" ? "A warm market hall with wooden stalls and hanging lights" : "A covered trading market with striped awnings and an open entrance"}>
      <div className={`market-player market-player--${stage}`}><ChibiSprite size={240}
        animation={stage === "inside" ? "idle" : "walk"} label={stage === "inside" ? "Your trader at the market" : "Your trader walking into the market"} /></div>
    </SceneStage>
    {stage === "inside" && <section className="trading-stall" aria-label="Trading market">
      <header className="stall-awning"><div><span className="eyebrow">TRADING MARKET · DAY {game.day}</span>
        <h1>{puzzle?.title ?? "Today's market"}</h1></div>
        <button className="close-button" aria-label="Leave market" onClick={() => navigate("/Room")}>×</button></header>
      <div className="stall-navigation"><nav aria-label="Market stalls">{[0, 1, 2].map((index) => <button key={index}
        aria-pressed={selected === index} disabled={busy} onClick={() => setSelected(index)}>
        Stall {index + 1}{resource.data?.stalls[index].completedToday ? " ✓" : ""}</button>)}</nav>
        <span className="numeric">{game.arbitrage.completedCount} / {game.arbitrage.dailyLimit} traded</span></div>
      <div className="stall-scroll" ref={scrollRef} aria-busy={busy}><StatusBanner />
        {resource.loading ? <p role="status" className="stall-message">Loading the stalls…</p> : resource.error ?
          <p role="alert" className="stall-message">{resource.error} <button onClick={resource.reload}>Retry market</button></p> : puzzle &&
          <MarketStall puzzle={puzzle} draft={drafts[puzzle.puzzleId] ?? {}} busy={busy} marketComplete={game.arbitrage.completedToday}
            onChange={(itemId, side, value) => setDrafts((current) => ({ ...current, [puzzle.puzzleId]: {
              ...current[puzzle.puzzleId], [itemId]: { ...(current[puzzle.puzzleId]?.[itemId] ?? { buy: "0", sell: "0" }), [side]: value },
            } }))}
            onSubmit={async (orders) => { await act({ type: "arbitrage/execute", input: { puzzleId: puzzle.puzzleId, orders } }); }} />}
      </div>
      <footer className="stall-browse"><button disabled={busy} onClick={() => changeStall(-1)}>← Previous stall</button>
        <span>Browse all three before deciding.</span><button disabled={busy} onClick={() => changeStall(1)}>Next stall →</button></footer>
    </section>}
  </>;
}
