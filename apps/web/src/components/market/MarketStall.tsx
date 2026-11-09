import type { ArbitragePuzzleDTO, ArbitrageRequest } from "@bullish/shared";
import type { FormEvent } from "react";
import { money } from "../../lib/format";

export type StallDraft = Record<string, { buy: string; sell: string }>;

export default function MarketStall({ puzzle, draft, busy, marketComplete, onChange, onSubmit }: {
  puzzle: ArbitragePuzzleDTO;
  draft: StallDraft;
  busy: boolean;
  marketComplete: boolean;
  onChange: (itemId: string, side: "buy" | "sell", value: string) => void;
  onSubmit: (orders: ArbitrageRequest["orders"]) => Promise<void>;
}) {
  const quantities = puzzle.items.map((item) => ({ itemId: item.id,
    buy: draft[item.id]?.buy ?? "0", sell: draft[item.id]?.sell ?? "0" }));
  const validQuantity = (value: string) => /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) <= 2_147_483_647;
  const valid = quantities.every((item) => validQuantity(item.buy) && validQuantity(item.sell))
    && quantities.some((item) => Number(item.buy) > 0) && quantities.some((item) => Number(item.sell) > 0);
  const completed = puzzle.completedToday || marketComplete;
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!valid || busy || completed) return;
    await onSubmit(quantities.map((item) => ({ itemId: item.itemId,
      buyQuantity: Number(item.buy), sellQuantity: Number(item.sell) })));
  };

  return <form className="stall-order" onSubmit={(event) => void submit(event)} aria-label={`${puzzle.title} trade`}>
    <p className="stall-rules">Repack freely. Buy and sell the same total number of {puzzle.unitName}.
      Pay upfront. One trade per stall.</p>
    <div className="market-shelf" data-item-count={puzzle.items.length}>
      {puzzle.items.map((item) => <article className="shelf-item" key={item.id}>
        <div className="shelf-package" aria-hidden="true"><span>{item.units}×</span></div>
        <h2>{item.name}</h2>
        <p className="shelf-unit">{item.units === 1 ? "Single unit" : `${item.units} ${puzzle.unitName}`}</p>
        <dl className="shelf-prices"><div><dt>Buy</dt><dd>{money(item.buyPricePence)}</dd></div>
          <div><dt>Sell</dt><dd>{money(item.sellPricePence)}</dd></div></dl>
        <div className="shelf-quantities">{(["buy", "sell"] as const).map((side) => {
          const inputId = `${puzzle.puzzleId}-${item.id}-${side}`;
          return <label key={side} htmlFor={inputId}>{side === "buy" ? "Buy qty" : "Sell qty"}
            <input id={inputId} aria-label={`${side === "buy" ? "Buy" : "Sell"} quantity: ${item.name}`}
              type="number" inputMode="numeric" min="0" step="1" max="2147483647" required
              value={draft[item.id]?.[side] ?? "0"} disabled={busy || completed}
              onChange={(event) => onChange(item.id, side, event.target.value)} />
          </label>;
        })}</div>
      </article>)}
    </div>
    <div className="stall-checkout">{completed ? <p role="status">{marketComplete
      ? "Today's market trades are complete. Come back tomorrow."
      : "Trade confirmed at this stall. Browse the other stalls when you're ready."}</p>
      : <><p>Check the posted prices and your quantities before committing.</p>
        <button className="primary" disabled={busy || !valid}>{busy ? "Trading…" : "Confirm trade"}</button></>}
    </div>
  </form>;
}
