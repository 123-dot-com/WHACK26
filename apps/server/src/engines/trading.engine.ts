import type { TradeRequest } from "@bullish/shared";
import { AppError } from "../lib/app-error.ts";
import { checkedPence } from "../lib/money.ts";

export function calculateTrade(
  cashPence: number, quantityHeld: number, pricePence: number,
  input: Pick<TradeRequest, "side" | "quantity">,
) {
  const totalPence = checkedPence(pricePence * input.quantity);
  if (input.side === "BUY" && totalPence > cashPence) {
    throw new AppError(422, "INSUFFICIENT_CASH", "Not enough Current Cash to buy these shares.");
  }
  if (input.side === "SELL" && input.quantity > quantityHeld) {
    throw new AppError(422, "INSUFFICIENT_HOLDINGS", "You cannot sell more shares than you hold.");
  }
  const sign = input.side === "BUY" ? 1 : -1;
  return {
    totalPence,
    cashPence: checkedPence(cashPence - sign * totalPence),
    quantity: checkedPence(quantityHeld + sign * input.quantity),
  };
}
