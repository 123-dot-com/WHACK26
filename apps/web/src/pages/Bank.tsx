import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useGame } from "../hooks/game-context";
import { gamePath } from "../lib/format";
import ChibiSprite from "../components/pixel/ChibiSprite";
import PixelDialog from "../components/pixel/PixelDialog";
import SceneStage from "../components/scene/SceneStage";
import StatusBanner from "../components/StatusBanner";
import SavingsDesk from "../components/bank/SavingsDesk";
import LoansDesk from "../components/bank/LoansDesk";

export default function Bank() {
  const { game } = useGame();
  const navigate = useNavigate();
  const [stage, setStage] = useState<"outside" | "walking" | "inside">(() =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "inside" : "outside");
  const [service, setService] = useState<"SAVINGS" | "LOANS" | null>(null);
  useEffect(() => {
    const image = new Image(); image.src = "/art/bank-interior-white.png";
    const start = setTimeout(() => setStage((current) => current === "outside" ? "walking" : current), 200);
    const arrive = setTimeout(() => setStage("inside"), 1700);
    return () => { clearTimeout(start); clearTimeout(arrive); };
  }, []);
  if (!game) return null;
  if (game.phase !== "TRADING") return <Navigate to={gamePath(game)} replace />;
  return <>
    <SceneStage src={stage === "inside" ? "/art/bank-interior-white.png" : "/art/bank-exterior-white.png"}
      width={stage === "inside" ? 1536 : 1672} height={stage === "inside" ? 1024 : 941}
      alt={stage === "inside" ? "A grand white marble bank with Savings at the counter and Loans at the vault" : "A white classical London bank with grand columns and green entrance doors"}>
      <div className={"bank-player bank-player--" + stage}><ChibiSprite size={240} animation={stage === "inside" ? "idle" : "walk"} /></div>
      {stage === "inside" && <>
        <button className="scene-hotspot bank-counter-hotspot" onClick={() => setService("SAVINGS")}><span>Savings</span></button>
        <button className="scene-hotspot bank-vault-hotspot" onClick={() => setService("LOANS")}><span>Loans</span></button>
      </>}
    </SceneStage>
    <section className="scene-caption bank-caption"><span className="eyebrow">BULLISH PRIVATE BANK</span>
      <h1>{stage === "inside" ? "A little capital. A lot of ambition." : "Making an entrance."}</h1>
      <p>{stage === "inside" ? "Choose Savings at the counter or Loans at the vault." : "Your finance bro is walking into the bank."}</p>
      {stage !== "inside" ? <button className="quiet" onClick={() => setStage("inside")}>Go inside</button>
        : <button className="quiet" onClick={() => navigate("/Room")}>Leave bank</button>}
    </section>
    {service && <PixelDialog label={service === "SAVINGS" ? "Savings services" : "Loan services"} className="bank-service-dialog" modal={false} onClose={() => setService(null)}>
      <header className="bank-service-heading"><div><span className="eyebrow">BULLISH PRIVATE BANK</span><h2>{service === "SAVINGS" ? "Your monthly savings desk." : "Your loan desk."}</h2></div>
        <button className="close-button" aria-label="Close bank services" onClick={() => setService(null)}>×</button></header>
      <StatusBanner />
      <div className="bank-service-scroll">{service === "SAVINGS" ? <SavingsDesk /> : <LoansDesk />}</div>
    </PixelDialog>}
  </>;
}
