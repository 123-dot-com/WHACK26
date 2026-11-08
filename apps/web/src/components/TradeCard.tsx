import { useState, type FormEvent } from "react";
import type { GameStateDTO } from "@bullish/shared";
import { useGame } from "../hooks/game-context";
import { money } from "../lib/format";

export default function TradeCard({ stock }: { stock: GameStateDTO["stocks"][number] }) {
  const { busy, act } = useGame();
  const [quantity, setQuantity] = useState("1");
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [notice, setNotice] = useState("");
  const count = Number(quantity);
  const valid = /^\d+$/.test(quantity) && Number.isSafeInteger(count) && count > 0 && count <= 2_147_483_647;
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (!valid) return;
    setNotice("");
    const updated = await act({ type: "trades", input: { stockId: stock.id, side, quantity: count } });
    if (updated) setNotice(`${side === "BUY" ? "Bought" : "Sold"} ${count} ${stock.id} shares.`);
  };
  return <article className="card stock-card"><div className="stock-heading"><span className="ticker">{stock.id}</span><span className="tag">{stock.quantityHeld} held</span></div>
    <h2>{stock.name}</h2><p className="stock-price">{money(stock.pricePence)}</p>
    <form onSubmit={(event) => void submit(event)}><label htmlFor={`side-${stock.id}`}>Action</label>
      <select id={`side-${stock.id}`} value={side} disabled={busy} onChange={(event) => setSide(event.target.value as "BUY" | "SELL")}><option value="BUY">BUY</option><option value="SELL">SELL</option></select>
      <label htmlFor={`quantity-${stock.id}`}>Shares · {stock.id}</label>
      <input id={`quantity-${stock.id}`} type="number" min="1" max="2147483647" step="1" required value={quantity} disabled={busy} onChange={(event) => setQuantity(event.target.value)} />
      <p className="trade-preview">Estimated {side === "BUY" ? "cost" : "proceeds"}: <strong>{valid ? money(count * stock.pricePence) : "—"}</strong></p>
      <button className={side === "BUY" ? "primary" : "sell"} disabled={busy || !valid}>{side} {stock.id}</button>
      <p className="success" role="status">{notice}</p></form></article>;
}
