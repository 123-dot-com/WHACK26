import { z } from "zod";
import { LOAN_MAX_PENCE } from "../rules/loans.js";

const positiveInteger = z.number().int().positive().max(2_147_483_647);
const expectedVersion = z.number().int().nonnegative().max(2_147_483_646);

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

export const borrowRequestSchema = z.strictObject({
  amountPence: positiveInteger.max(LOAN_MAX_PENCE),
  expectedVersion,
});

export const openMarketRequestSchema = z.strictObject({
  expectedVersion,
});
export const predictionRequestSchema = z.strictObject({
  direction: z.enum(["BULLISH", "NEUTRAL", "BEARISH"]),
  expectedVersion,
});

export const versionRequestSchema = z.strictObject({ expectedVersion });
export const arbitrageRequestSchema = z.strictObject({
  puzzleId: z.string().min(1).max(32),
  orders: z.array(z.strictObject({
    itemId: z.string().min(1).max(32),
    buyQuantity: z.number().int().min(0).max(2_147_483_647),
    sellQuantity: z.number().int().min(0).max(2_147_483_647),
  })).min(1).max(4),
  expectedVersion,
});
export const idempotencyKeySchema = z.string().min(1).max(128)
  .regex(/^[A-Za-z0-9._:-]+$/);

export type PredictionRequest = z.infer<
  typeof predictionRequestSchema
>;

export type TradeRequest = z.infer<typeof tradeRequestSchema>;
export type BankTransferRequest = z.infer<typeof bankTransferRequestSchema>;
export type VersionRequest = z.infer<typeof versionRequestSchema>;
export type ArbitrageRequest = z.infer<typeof arbitrageRequestSchema>;
export type BorrowRequest = z.infer<typeof borrowRequestSchema>;
