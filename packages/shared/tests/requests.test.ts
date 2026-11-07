import { describe, expect, it } from "vitest";
import { bankTransferRequestSchema, tradeRequestSchema } from "../src/index.js";

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
