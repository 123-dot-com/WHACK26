import { describe, expect, it } from "vitest";
import {
  bankTransferRequestSchema,
  predictionRequestSchema,
  tradeRequestSchema,
  arbitrageRequestSchema,
} from "../src/index.js";

const trade = {
  stockId: "NOVA",
  side: "BUY",
  quantity: 20,
  expectedVersion: 0,
};

describe("financial request boundaries", () => {
  it("accepts whole shares and a zero initial state version", () => {
    expect(tradeRequestSchema.parse(trade)).toEqual(trade);
  });

  it.each([0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])(
    "rejects an invalid share quantity: %s",
    (quantity) => {
      expect(tradeRequestSchema.safeParse({ ...trade, quantity }).success).toBe(false);
    },
  );

  it("rejects a client-supplied price", () => {
    expect(tradeRequestSchema.safeParse({ ...trade, pricePence: 1 }).success).toBe(false);
  });

  it.each([-1, 0.5])("rejects an invalid state version: %s", (version) => {
    expect(tradeRequestSchema.safeParse({ ...trade, expectedVersion: version }).success)
      .toBe(false);
  });

  it.each([0, -100, 12.5, "50000", Number.MAX_SAFE_INTEGER + 1])(
    "rejects an invalid pence amount: %s",
    (amountPence) => {
      expect(bankTransferRequestSchema.safeParse({ amountPence, expectedVersion: 0 }).success)
        .toBe(false);
    },
  );

  it("accepts a transfer specified in integer pence", () => {
    expect(bankTransferRequestSchema.parse({ amountPence: 50000, expectedVersion: 0 }))
      .toEqual({ amountPence: 50000, expectedVersion: 0 });
  });
});

describe("arbitrage basket requests", () => {
  const input = { puzzleId: "water-D1", expectedVersion: 0,
    orders: [{ itemId: "pack-6", buyQuantity: 2, sellQuantity: 0 }, { itemId: "pack-4", buyQuantity: 0, sellQuantity: 3 }] };
  it("accepts independent nonnegative whole buy and sell quantities", () => {
    expect(arbitrageRequestSchema.parse(input)).toEqual(input);
  });
  it.each([-1, 1.5, "2", 2_147_483_648])("rejects invalid buy quantity %s", (buyQuantity) => {
    expect(arbitrageRequestSchema.safeParse({ ...input, orders: [{ itemId: "pack-1", buyQuantity, sellQuantity: 0 }] }).success).toBe(false);
  });
  it("rejects empty baskets, more than four lines and client-supplied prices", () => {
    expect(arbitrageRequestSchema.safeParse({ ...input, orders: [] }).success).toBe(false);
    expect(arbitrageRequestSchema.safeParse({ ...input, orders: Array(5).fill(input.orders[0]) }).success).toBe(false);
    expect(arbitrageRequestSchema.safeParse({ ...input, orders: [{ ...input.orders[0], buyPricePence: 1 }] }).success).toBe(false);
    expect(arbitrageRequestSchema.safeParse({ ...input, profitPence: 1000 }).success).toBe(false);
  });
});

describe("prediction requests", () => {
  it.each(["BULLISH", "NEUTRAL", "BEARISH"])("accepts %s", (direction) => {
    expect(predictionRequestSchema.parse({ direction, expectedVersion: 0 }))
      .toEqual({ direction, expectedVersion: 0 });
  });

  it.each(["UP", "bullish", ""])("rejects unsupported direction %s", (direction) => {
    expect(predictionRequestSchema.safeParse({ direction, expectedVersion: 0 }).success)
      .toBe(false);
  });

  it.each([-1, 0.5, "0", 2_147_483_648, undefined])(
    "rejects invalid version %s",
    (expectedVersion) => {
      expect(predictionRequestSchema.safeParse({ direction: "BULLISH", expectedVersion }).success)
        .toBe(false);
    },
  );

  it("rejects a client-selected focus stock", () => {
    expect(predictionRequestSchema.safeParse({
      direction: "BULLISH", expectedVersion: 0, stockId: "GREEN",
    }).success).toBe(false);
  });
});
