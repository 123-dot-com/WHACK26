import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import EndDayButton from "../components/EndDayButton";
import { useGame } from "../hooks/game-context";
import { gamePath, money, poundsToPence } from "../lib/format";
import ChibiSprite from "../components/pixel/ChibiSprite";

export default function Bank() {
  const { game, busy, act } = useGame();
  const [amount, setAmount] = useState("500.00");
  const [operation, setOperation] = useState<"deposit" | "withdraw">("deposit");
  const [notice, setNotice] = useState("");
  if (!game) return null;
  if (game.phase !== "TRADING") return <Navigate to={gamePath(game)} replace />;
  const amountPence = poundsToPence(amount);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (amountPence === null) return;
    setNotice("");
    const updated = await act({ type: operation === "deposit" ? "bank/deposit" : "bank/withdraw", input: { amountPence } });
    if (updated) setNotice(`${operation === "deposit" ? "Deposited" : "Withdrew"} ${money(amountPence)}.`);
  };
  return <><div className="eyebrow">THE BANK</div><h1>Give your money a breather.</h1>
    <div className="bank-scene"><img src="/art/bank-interior.png" alt="A cozy pixel art bank with a wooden teller counter, a vault and a sunny window" width="1536" height="1024" />
      <span className="bank-scene__character"><ChibiSprite size={152} animation={busy ? "walk" : "idle"} label="Your chibi character visits the bank" /></span>
      <span className="bank-scene__speech">Welcome! A little saving goes a long way.</span></div>
    <div className="two-column"><article className="card"><h2>Current Account</h2><p className="stock-price">{money(game.wallet.cashPence)}</p><p>Ready for trading and arbitrage.</p></article>
      <article className="card"><h2>Savings Account</h2><p className="stock-price">{money(game.wallet.savingsPence)}</p>
        <p>{(game.wallet.annualInterestBps / 100).toFixed(0)}% annual interest · one game day = one month.</p>
        <p className="muted">Estimated at close: {money(Math.round(game.wallet.savingsPence * game.wallet.annualInterestBps / 120_000))}. Interest compounds once per day.</p></article></div>
    <form className="card transfer-form" onSubmit={(event) => void submit(event)}><h2>Move money</h2>
      <label htmlFor="bank-operation">Transfer</label><select id="bank-operation" value={operation} disabled={busy} onChange={(event) => setOperation(event.target.value as "deposit" | "withdraw")}>
        <option value="deposit">Deposit · Current → Savings</option><option value="withdraw">Withdraw · Savings → Current</option></select>
      <label htmlFor="bank-amount">Amount (£)</label><input id="bank-amount" inputMode="decimal" value={amount} disabled={busy} onChange={(event) => setAmount(event.target.value)} required />
      <p className="muted">Use up to two decimal places. No fees or lock periods.</p><button className="primary" disabled={busy || amountPence === null}>{operation === "deposit" ? "Deposit" : "Withdraw"}</button>
      <p role="status" className="success">{notice}</p></form><EndDayButton /></>;
}
