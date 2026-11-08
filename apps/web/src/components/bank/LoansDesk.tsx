import { useState, type FormEvent } from "react";
import { useGame } from "../../hooks/game-context";
import { money, poundsToPence } from "../../lib/format";

export default function LoansDesk() {
  const { game, busy, act, refresh } = useGame();
  const [amount, setAmount] = useState("10000.00");
  const [notice, setNotice] = useState("");
  if (!game) return null;
  // An open development tab may still hold the DTO from before the loan migration.
  if (!game.loan) return <button onClick={() => void refresh()}>Load loan details</button>;
  const terms = game.loan;
  const active = terms.active;
  const locked = game.day <= terms.lockedThroughDay;
  const amountPence = poundsToPence(amount);
  const valid = amountPence !== null && amountPence <= terms.maxPrincipalPence;
  const quote = valid ? amountPence + Math.round(amountPence * terms.dailyInterestBps / 10000) : 0;
  const borrow = async (event: FormEvent) => {
    event.preventDefault(); if (!valid || !terms.canBorrow) return;
    setNotice("");
    const result = await act({ type: "bank/loans/borrow", input: { amountPence } });
    if (result) setNotice("Borrowed " + money(amountPence) + ". Repayment is due on Day " + result.loan.active!.dueDay + ".");
  };
  return <>
    <div className="loan-terms"><strong><span className="numeric">{terms.dailyInterestBps / 100}%</span> interest per day</strong>
      <p>Borrow up to <b className="numeric">{money(terms.maxPrincipalPence)}</b>. One active loan. Full repayment is due the next day.</p>
      <p className="muted">Missing the deadline compounds another 5% at close and locks borrowing through the following day. You can always repay.</p></div>
    {locked && <p className="loan-lock" role="status">Borrowing locked through Day {terms.lockedThroughDay}. After repayment, you must still wait until Day {terms.lockedThroughDay + 1} to borrow again.</p>}
    {active ? <section className="loan-summary">
      <span className={"tag " + (active.overdue ? "negative" : "")}>{active.overdue ? "OVERDUE" : "ACTIVE LOAN"}</span>
      <dl className="loan-figures"><div><dt>Principal borrowed</dt><dd>{money(active.principalPence)}</dd></div>
        <div><dt>Outstanding debt</dt><dd>{money(active.balancePence)}</dd></div>
        <div><dt>Full repayment today</dt><dd>{money(active.repaymentPence)}</dd></div>
        <div><dt>Repayment deadline</dt><dd>Day {active.dueDay}</dd></div></dl>
      {game.day === active.borrowedDay && <p className="muted">Early repayment includes the first day's 5% interest.</p>}
      <button className="primary" aria-label="Repay loan" disabled={busy || game.wallet.cashPence < active.repaymentPence} onClick={async () => {
        setNotice(""); const result = await act({ type: "bank/loans/repay" }); if (result) setNotice("Loan repaid in full.");
      }}>Repay {money(active.repaymentPence)}</button>
      {game.wallet.cashPence < active.repaymentPence && <p className="negative">Current Cash is {money(game.wallet.cashPence)}. Withdraw Savings or sell shares to cover the full repayment.</p>}
    </section> : <form className="loan-borrow-form" onSubmit={(event) => void borrow(event)}>
      <label htmlFor="loan-amount">Loan amount (£)</label><input id="loan-amount" inputMode="decimal" value={amount} disabled={busy || locked} onChange={(event) => setAmount(event.target.value)} required />
      <p>Due on Day <b className="numeric">{game.day + 1}</b>: <b className="numeric">{valid ? money(quote) : "—"}</b></p>
      {!valid && <p className="negative">Enter an amount between £0.01 and {money(terms.maxPrincipalPence)}.</p>}
      <button className="primary" disabled={busy || !valid || !terms.canBorrow}>Borrow money</button>
      {game.day === 3 && <p className="muted">The run ends after Day 3. Any unpaid debt, including interest, is deducted from your final wealth.</p>}
    </form>}
    <p className="success" role="status">{notice}</p>
  </>;
}
