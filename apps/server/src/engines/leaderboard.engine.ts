import type { LeaderboardDTO, WealthEntryDTO } from "@bullish/shared";
import { botStockValue, STARTING_WEALTH_PENCE, type BotPortfolio, type BotStock } from "./bot.engine.ts";

export function buildLeaderboard(
  bots: BotPortfolio[], stocks: Pick<BotStock, "id" | "pricePence">[],
  player: { cashPence: number; savingsPence: number; stockValuePence: number; debtPence: number },
  day: number, settledDay: number,
): LeaderboardDTO {
  const entry = (data: Omit<WealthEntryDTO, "rank" | "grossAssetsPence" | "netWorthPence" | "returnPct">): WealthEntryDTO => {
    const grossAssetsPence = data.cashPence + data.savingsPence + data.stockValuePence;
    const netWorthPence = grossAssetsPence - data.debtPence;
    return { ...data, rank: 0, grossAssetsPence, netWorthPence,
      returnPct: (netWorthPence - STARTING_WEALTH_PENCE) / STARTING_WEALTH_PENCE * 100 };
  };
  const entries = bots.map((bot) => entry({ id: bot.id, name: bot.name, isPlayer: false, group: bot.group,
    cashPence: bot.cashPence, savingsPence: bot.savingsPence, stockValuePence: botStockValue(bot, stocks),
    debtPence: bot.loan?.balancePence ?? 0, lastActions: bot.lastActions }));
  entries.push(entry({ ...player, id: "PLAYER", name: "You", isPlayer: true, group: null, lastActions: [] }));
  entries.sort((a, b) => b.netWorthPence - a.netWorthPence || Number(b.isPlayer) - Number(a.isPlayer) || a.id.localeCompare(b.id));
  for (let index = 0; index < entries.length; index++) {
    entries[index].rank = index > 0 && entries[index].netWorthPence === entries[index - 1].netWorthPence
      ? entries[index - 1].rank : index + 1;
  }
  return { day, settledDay, totalParticipants: entries.length, entries: entries.slice(0, 10),
    player: entries.find((item) => item.isPlayer)! };
}
