import { z } from "zod";

const positiveInteger = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const expectedVersion = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);

export const tradeRequestSchema = z.strictObject({
  stockId: z.enum(["NOVA", "GREEN", "FINX"]),
  side: z.enum(["BUY", "SELL"]),
  quantity: positiveInteger,
  expectedVersion,
});

export const bankTransferRequestSchema = z.strictObject({
  amountPence: positiveInteger,
  expectedVersion,
});

export const openMarketRequestSchema = z.strictObject({
  expectedVersion: expectedVersion.max(2_147_483_647),
});
export type TradeRequest = z.infer<typeof tradeRequestSchema>;
export type BankTransferRequest = z.infer<typeof bankTransferRequestSchema>;
