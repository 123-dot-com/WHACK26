import type { AgentGroup, InvestorActivityDTO, NewsDTO, StockId } from "@bullish/shared";
import { agentGroups, decideCrowd } from "./crowd.engine.ts";
import { calculateArbitrage, createArbitrageMarket, findArbitrageOrder } from "./arbitrage.engine.ts";
import { calculateInterest, calculateTransfer } from "./bank.engine.ts";
import { accrueLoan, calculateBorrow, calculateRepayment, repaymentQuote, type LoanBalance } from "./loan.engine.ts";
import { calculateTrade } from "./trading.engine.ts";
import { clamp, seededRandom } from "./random.ts";

export const STARTING_WEALTH_PENCE = 1_000_000;
const SAVINGS_LIMIT_PENCE = 500_000;
const SAVINGS_INTEREST_BPS = 200;

export interface BotPortfolio {
  id: string;
  name: string;
  group: AgentGroup;
  cashPence: number;
  savingsPence: number;
  holdings: Record<StockId, number>;
  loan: LoanBalance | null;
  lockedThroughDay: number;
  lastActions: InvestorActivityDTO[];
}

export interface BotStock {
  id: StockId;
  pricePence: number;
  previousPricePence: number;
}

export interface BotDayContext {
  seed: number;
  day: number;
  news: NewsDTO;
  stocks: BotStock[];
}

interface Strategy {
  name: string;
  savings: number;
  tradeFraction: number;
  sellFraction: number;
  arbitrageChance: number;
  borrowThreshold: number;
  borrowChance: number;
  borrowPence: number;
}

const strategies: Record<AgentGroup, Strategy> = {
  OPTIMIST: { name: "Sunny", savings: .15, tradeFraction: .3, sellFraction: .5,
    arbitrageChance: .65, borrowThreshold: .65, borrowChance: .35, borrowPence: 250_000 },
  PESSIMIST: { name: "Hedge", savings: .5, tradeFraction: .1, sellFraction: .8,
    arbitrageChance: .8, borrowThreshold: Infinity, borrowChance: 0, borrowPence: 0 },
  FOMO: { name: "Rocket", savings: .05, tradeFraction: .5, sellFraction: .5,
    arbitrageChance: .35, borrowThreshold: .3, borrowChance: .65, borrowPence: 500_000 },
  PANIC: { name: "Shelter", savings: .45, tradeFraction: .15, sellFraction: 1,
    arbitrageChance: .45, borrowThreshold: Infinity, borrowChance: 0, borrowPence: 0 },
  LONG_TERM: { name: "Oak", savings: .5, tradeFraction: .2, sellFraction: .25,
    arbitrageChance: .7, borrowThreshold: Infinity, borrowChance: 0, borrowPence: 0 },
  ANALYST: { name: "Quant", savings: .25, tradeFraction: .3, sellFraction: .6,
    arbitrageChance: 1, borrowThreshold: .85, borrowChance: .2, borrowPence: 200_000 },
};

export function createBotPortfolios(): BotPortfolio[] {
  return agentGroups.flatMap((group) => Array.from({ length: group.count }, (_, index) => ({
    id: `${group.type}-${index + 1}`,
    name: `${strategies[group.type].name} ${String(index + 1).padStart(2, "0")}`,
    group: group.type,
    cashPence: STARTING_WEALTH_PENCE,
    savingsPence: 0,
    holdings: { NOVA: 0, GREEN: 0, FINX: 0 },
    loan: null,
    lockedThroughDay: 0,
    lastActions: [],
  })));
}

export function botStockValue(bot: BotPortfolio, stocks: Pick<BotStock, "id" | "pricePence">[]) {
  return stocks.reduce((sum, stock) => sum + bot.holdings[stock.id] * stock.pricePence, 0);
}

export function planBotDay(portfolios: BotPortfolio[], context: BotDayContext): BotPortfolio[] {
  const stocks = [...context.stocks].sort((a, b) => a.id.localeCompare(b.id));
  const decisions = new Map(stocks.map((stock) => [stock.id, new Map(decideCrowd({
    seed: context.seed, day: context.day, stockId: stock.id,
    newsSignal: context.news.affectedStockIds.includes(stock.id) ? context.news.impact : 0,
    momentum: context.day === 1 ? 0 : clamp((stock.pricePence / stock.previousPricePence - 1) / .1, -1, 1),
  }).map((decision) => [decision.id, decision]))]));

  return portfolios.map((original) => {
    const bot: BotPortfolio = { ...original, holdings: { ...original.holdings },
      loan: original.loan ? { ...original.loan } : null, lastActions: [] };
    const strategy = strategies[bot.group];
    const random = seededRandom(context.seed, context.day, bot.id, "portfolio");
    const actions = bot.lastActions;
    let savingsDepositedTodayPence = 0;
    const transfer = (amountPence: number, operation: "DEPOSIT" | "WITHDRAW") => {
      if (amountPence <= 0) return;
      Object.assign(bot, calculateTransfer(bot.cashPence, bot.savingsPence, amountPence, operation,
        SAVINGS_LIMIT_PENCE, savingsDepositedTodayPence));
      if (operation === "DEPOSIT") savingsDepositedTodayPence += amountPence;
      actions.push({ type: operation, amountPence });
    };
    const trade = (stock: BotStock, side: "BUY" | "SELL", quantity: number) => {
      if (quantity <= 0) return;
      const result = calculateTrade(bot.cashPence, bot.holdings[stock.id], stock.pricePence, { side, quantity });
      bot.cashPence = result.cashPence;
      bot.holdings[stock.id] = result.quantity;
      actions.push({ type: side, stockId: stock.id, quantity, amountPence: result.totalPence });
    };

    // Use savings and owned shares to repay due debt before taking new risks.
    let repaidToday = false;
    if (bot.loan && context.day >= bot.loan.dueDay) {
      const quote = repaymentQuote(bot.loan);
      transfer(Math.min(bot.savingsPence, Math.max(0, quote.repaymentPence - bot.cashPence)), "WITHDRAW");
      for (const stock of stocks) {
        const shortage = Math.max(0, quote.repaymentPence - bot.cashPence);
        trade(stock, "SELL", Math.min(bot.holdings[stock.id], Math.ceil(shortage / stock.pricePence)));
      }
      if (bot.cashPence >= quote.repaymentPence) {
        bot.cashPence = calculateRepayment(bot.cashPence, bot.loan).cashPence;
        actions.push({ type: "REPAY", amountPence: quote.repaymentPence });
        bot.loan = null;
        repaidToday = true;
      }
    }

    // Sentiment uses the same bot identities and noise as the market crowd.
    for (const stock of stocks) {
      if (decisions.get(stock.id)!.get(bot.id)!.side === "SELL") {
        trade(stock, "SELL", Math.ceil(bot.holdings[stock.id] * strategy.sellFraction));
      }
    }

    // Each bot sees the same three stalls and can fund one basket per stall.
    for (const puzzle of createArbitrageMarket(context.seed, context.day).stalls) {
      if (random() >= strategy.arbitrageChance) continue;
      const order = findArbitrageOrder(puzzle, Math.floor(bot.cashPence * (.1 + random() * .2)));
      if (order) {
        const result = calculateArbitrage(puzzle, order, bot.cashPence);
        bot.cashPence = result.cashPence;
        actions.push({ type: "ARBITRAGE", amountPence: result.profitPence, quantity: result.quantity });
      }
    }

    const buyStocks = stocks.filter((stock) => decisions.get(stock.id)!.get(bot.id)!.side === "BUY");
    const conviction = Math.max(0, ...buyStocks.map((stock) => decisions.get(stock.id)!.get(bot.id)!.score));
    if (!bot.loan && !repaidToday && context.day > bot.lockedThroughDay
      && conviction >= strategy.borrowThreshold && random() < strategy.borrowChance) {
      const borrowed = calculateBorrow(bot.cashPence, strategy.borrowPence, context.day, null, bot.lockedThroughDay);
      bot.cashPence = borrowed.cashPence;
      bot.loan = { id: `${bot.id}-D${context.day}`, principalPence: borrowed.principalPence,
        balancePence: borrowed.balancePence, borrowedDay: borrowed.borrowedDay,
        dueDay: borrowed.dueDay, lastAccruedDay: borrowed.lastAccruedDay };
      actions.push({ type: "BORROW", amountPence: borrowed.principalPence });
    }

    const netWorth = bot.cashPence + bot.savingsPence + botStockValue(bot, stocks) - (bot.loan?.balancePence ?? 0);
    const savingsTarget = Math.floor(Math.max(0, netWorth) * strategy.savings);
    if (buyStocks.length > 0 && bot.savingsPence > savingsTarget) transfer(bot.savingsPence - savingsTarget, "WITHDRAW");
    // Keep a cash reserve and fund savings from unborrowed money.
    const reserve = 50_000;
    for (const stock of buyStocks) {
      const budget = Math.floor(Math.max(0, bot.cashPence - reserve - savingsTarget + bot.savingsPence) * strategy.tradeFraction);
      trade(stock, "BUY", Math.min(Math.floor(budget / stock.pricePence), Math.floor(bot.cashPence / stock.pricePence)));
    }
    transfer(Math.min(SAVINGS_LIMIT_PENCE - savingsDepositedTodayPence, Math.max(0, savingsTarget - bot.savingsPence),
      Math.max(0, bot.cashPence - reserve - (bot.loan?.balancePence ?? 0))), "DEPOSIT");
    return bot;
  });
}

export function closeBotDay(portfolios: BotPortfolio[], day: number): BotPortfolio[] {
  return portfolios.map((original) => {
    const bot: BotPortfolio = { ...original, holdings: { ...original.holdings },
      loan: original.loan ? { ...original.loan } : null, lastActions: [...original.lastActions] };
    const interest = calculateInterest(bot.savingsPence, SAVINGS_INTEREST_BPS);
    bot.savingsPence += interest;
    if (interest > 0) bot.lastActions.push({ type: "SAVINGS_INTEREST", amountPence: interest });
    const accrual = accrueLoan(bot.loan, day, bot.lockedThroughDay);
    if (accrual && bot.loan) {
      bot.loan.balancePence = accrual.balancePence;
      bot.loan.lastAccruedDay = accrual.lastAccruedDay;
      bot.lockedThroughDay = accrual.lockedThroughDay;
      bot.lastActions.push({ type: accrual.type === "PENALTY" ? "LOAN_PENALTY" : "LOAN_INTEREST",
        amountPence: accrual.interestPence });
    }
    return bot;
  });
}
