import { useEffect, useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useGame } from "../hooks/game-context";
import { gamePath, money, poundsToPence } from "../lib/format";
import ChibiSprite from "../components/pixel/ChibiSprite";
import PixelDialog from "../components/pixel/PixelDialog";
import SceneStage from "../components/scene/SceneStage";
import StatusBanner from "../components/StatusBanner";

export default function Bank() {
  const { game, busy, act } = useGame();
  const navigate = useNavigate();
  const [stage, setStage] = useState<"outside" | "walking" | "inside">(() =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "inside" : "outside");
  const [service, setService] = useState<"DEPOSIT" | "WITHDRAW" | "TERMS" | null>(null);
  const [amount, setAmount] = useState("500.00");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const image = new Image(); image.src = "/art/bank-interior-white.png";
    const start = setTimeout(() => setStage((current) => current === "outside" ? "walking" : current), 200);
    const arrive = setTimeout(() => setStage("inside"), 1700);
    return () => { clearTimeout(start); clearTimeout(arrive); };
  }, []);
  if (!game) return null;
  if (game.phase !== "TRADING") return <Navigate to={gamePath(game)} replace />;
  const wallet = game.wallet;
  const remaining = Math.max(0, wallet.savingsDepositLimitPence - wallet.savingsPence);
  const amountPence = poundsToPence(amount);
  const maxAmount = service === "DEPOSIT" ? Math.min(remaining, wallet.cashPence) : wallet.savingsPence;
  const estimate = Number((BigInt(wallet.savingsPence) * BigInt(wallet.monthlyInterestBps) + 5000n) / 10000n);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (amountPence === null || (service !== "DEPOSIT" && service !== "WITHDRAW")) return;
    setNotice("");
    const updated = await act({ type: service === "DEPOSIT" ? "bank/deposit" : "bank/withdraw", input: { amountPence } });
    if (updated) setNotice((service === "DEPOSIT" ? "Deposited " : "Withdrew ") + money(amountPence) + ".");
  };
  return <>
    <SceneStage src={stage === "inside" ? "/art/bank-interior-white.png" : "/art/bank-exterior-white.png"}
      width={stage === "inside" ? 1536 : 1672} height={stage === "inside" ? 1024 : 941}
      alt={stage === "inside" ? "A grand white marble bank with a green teller counter and a gold-trimmed vault" : "A white classical London bank with grand columns and green entrance doors"}>
      <div className={"bank-player bank-player--" + stage}><ChibiSprite size={240} animation={stage === "inside" ? "idle" : "walk"} /></div>
      {stage === "inside" && <>
        <button className="scene-hotspot bank-counter-hotspot" onClick={() => { setNotice(""); setService("DEPOSIT"); }}><span>Talk to banker</span></button>
        <button className="scene-hotspot bank-vault-hotspot" onClick={() => setService("TERMS")}><span>Savings terms</span></button>
      </>}
    </SceneStage>
    <section className="scene-caption bank-caption"><span className="eyebrow">BULLISH PRIVATE BANK</span>
      <h1>{stage === "inside" ? "A little capital. A lot of ambition." : "Making an entrance."}</h1>
      <p>{stage === "inside" ? "Click the counter to deposit or withdraw. Click the vault for Savings terms." : "Your finance bro is walking into the bank."}</p>
      {stage !== "inside" ? <button className="quiet" onClick={() => setStage("inside")}>Go inside</button>
        : <button className="quiet" onClick={() => navigate("/Room")}>Leave bank</button>}
    </section>
    {service && <PixelDialog label="Bank services" className="bank-service-dialog" modal={false} onClose={() => setService(null)}>
      <header className="bank-service-heading"><div><span className="eyebrow">BULLISH PRIVATE BANK</span><h2>Your monthly savings desk.</h2></div>
        <button className="close-button" aria-label="Close bank services" onClick={() => setService(null)}>×</button></header>
      <StatusBanner />
      <div className="bank-service-scroll">
        <div className="bank-accounts"><div><span>Current Cash</span><strong>{money(wallet.cashPence)}</strong></div>
          <div><span>Savings</span><strong>{money(wallet.savingsPence)}</strong></div></div>
        <section className="savings-terms"><strong><span className="numeric">{wallet.monthlyInterestBps / 100}%</span> per month</strong>
          <p>Deposit limit <b className="numeric">{money(wallet.savingsDepositLimitPence)}</b> · One game day = one month.</p>
          <p>Room to deposit: <b className="numeric">{money(remaining)}</b>. Interest at close: <b className="numeric">{money(estimate)}</b>.</p>
          <p className="muted">Interest compounds on your full Savings balance and can take it above the deposit limit. Withdraw whenever you like.</p>
        </section>
        <div className="bank-service-tabs">{(["DEPOSIT", "WITHDRAW", "TERMS"] as const).map((item) => <button key={item} aria-pressed={service === item} disabled={busy}
          onClick={() => { setService(item); setNotice(""); }}>{item === "DEPOSIT" ? "Deposit" : item === "WITHDRAW" ? "Withdraw" : "Terms"}</button>)}</div>
        {service !== "TERMS" && <form onSubmit={(event) => void submit(event)}>
          <label htmlFor="bank-amount">Amount (£)</label><input id="bank-amount" inputMode="decimal" value={amount} disabled={busy} onChange={(event) => setAmount(event.target.value)} required />
          <p className="muted">Available to {service === "DEPOSIT" ? "deposit" : "withdraw"}: <span className="numeric">{money(maxAmount)}</span>.</p>
          {amountPence !== null && amountPence > maxAmount && <p className="negative" role="alert">{service === "DEPOSIT" ? "Your cash or remaining deposit limit is too low for this amount." : "Your Savings balance is too low for this withdrawal."}</p>}
          <button className="primary" disabled={busy || amountPence === null || amountPence > maxAmount}>{service === "DEPOSIT" ? "Confirm deposit" : "Confirm withdrawal"}</button>
          <p role="status" className="success">{notice}</p>
        </form>}
      </div>
    </PixelDialog>}
  </>;
}
