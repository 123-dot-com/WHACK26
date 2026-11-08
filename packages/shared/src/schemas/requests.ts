import { z } from "zod";

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
  route: z.enum(["BUY_BUNDLE_SELL_UNITS", "BUY_UNITS_SELL_BUNDLE"]),
  quantity: positiveInteger,
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
