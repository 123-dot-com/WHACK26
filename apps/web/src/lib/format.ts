import type { GameStateDTO } from "@bullish/shared";

export const money = (pence: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);
export const signedMoney = (pence: number) => `${pence > 0 ? "+" : ""}${money(pence)}`;
export const percent = (value: number) => `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;

export function gamePath(game: GameStateDTO) {
  return { BRIEFING: "/Briefing", TRADING: "/Market", REPORT: "/DailyReport", FINISHED: "/FinalReport" }[game.phase];
}

export function poundsToPence(value: string): number | null {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) return null;
  const [whole, fraction = ""] = value.split(".");
  const pence = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(pence) && pence > 0 && pence <= 2_147_483_647 ? pence : null;
}
