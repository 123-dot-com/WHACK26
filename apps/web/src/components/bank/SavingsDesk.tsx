import { useState, type FormEvent } from "react";
import { useGame } from "../../hooks/game-context";
import { money, poundsToPence } from "../../lib/format";

export default function SavingsDesk() {
  const { game, busy, act } = useGame();
  const [service, setService] = useState<"DEPOSIT" | "WITHDRAW" | "TERMS">("DEPOSIT");
  const [amount, setAmount] = useState("500.00");
  const [notice, setNotice] = useState("");
  if (!game) return null;
  const wallet = game.wallet;
  const remaining = Math.max(0, wallet.savingsDepositLimitPence - wallet.savingsPence);
  const amountPence = poundsToPence(amount);
  const maxAmount = service === "DEPOSIT" ? Math.min(remaining, wallet.cashPence) : wallet.savingsPence;
  const estimate = Number((BigInt(wallet.savingsPence) * BigInt(wallet.monthlyInterestBps) + 5000n) / 10000n);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (amountPence === null || service === "TERMS") return;
    setNotice("");
    const updated = await act({ type: service === "DEPOSIT" ? "bank/deposit" : "bank/withdraw", input: { amountPence } });
    if (updated) setNotice((service === "DEPOSIT" ? "Deposited " : "Withdrew ") + money(amountPence) + ".");
  };
  return <><div className="bank-accounts"><div><span>Current Cash</span><strong>{money(wallet.cashPence)}</strong></div>
    <div><span>Savings</span><strong>{money(wallet.savingsPence)}</strong></div></div>
    <section className="savings-terms"><strong><span className="numeric">{wallet.monthlyInterestBps / 100}%</span> per month</strong>
      <p>Deposit limit <b className="numeric">{money(wallet.savingsDepositLimitPence)}</b> · One game day = one month.</p>
      <p>Room to deposit: <b className="numeric">{money(remaining)}</b>. Interest at close: <b className="numeric">{money(estimate)}</b>.</p>
      <p className="muted">Interest compounds on your full Savings balance and can take it above the deposit limit. Withdraw whenever you like.</p></section>
    <div className="bank-service-tabs">{(["DEPOSIT", "WITHDRAW", "TERMS"] as const).map((item) => <button key={item} aria-pressed={service === item} disabled={busy}
      onClick={() => { setService(item); setNotice(""); }}>{item === "DEPOSIT" ? "Deposit" : item === "WITHDRAW" ? "Withdraw" : "Terms"}</button>)}</div>
    {service !== "TERMS" && <form onSubmit={(event) => void submit(event)}>
      <label htmlFor="bank-amount">Amount (£)</label><input id="bank-amount" inputMode="decimal" value={amount} disabled={busy} onChange={(event) => setAmount(event.target.value)} required />
      <p className="muted">Available to {service === "DEPOSIT" ? "deposit" : "withdraw"}: <span className="numeric">{money(maxAmount)}</span>.</p>
      {amountPence !== null && amountPence > maxAmount && <p className="negative" role="alert">{service === "DEPOSIT" ? "Your cash or remaining deposit limit is too low for this amount." : "Your Savings balance is too low for this withdrawal."}</p>}
      <button className="primary" disabled={busy || amountPence === null || amountPence > maxAmount}>{service === "DEPOSIT" ? "Confirm deposit" : "Confirm withdrawal"}</button>
      <p role="status" className="success">{notice}</p></form>}
  </>;
}
