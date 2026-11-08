import { describe, expect, it } from "vitest";
import { accrueLoan, calculateBorrow, calculateRepayment, loanInterest, repaymentQuote } from "../engines/loan.engine.ts";

const loan = { id: "loan-1", principalPence: 1_000_000, balancePence: 1_000_000,
  borrowedDay: 1, dueDay: 2, lastAccruedDay: 0 };

describe("loan rules in integer pence", () => {
  it("quotes 10,500 on a 10,000 next-day loan and compounds missed repayments", () => {
    expect(calculateBorrow(1_000_000, 1_000_000, 1, null, 0).cashPence).toBe(2_000_000);
    expect(repaymentQuote(loan).repaymentPence).toBe(1_050_000);
    const day1 = accrueLoan(loan, 1, 0)!;
    expect(day1).toMatchObject({ balancePence: 1_050_000, interestPence: 50_000, type: "INTEREST", lockedThroughDay: 0 });
    const day2 = accrueLoan({ ...loan, ...day1 }, 2, 0)!;
    expect(day2).toMatchObject({ balancePence: 1_102_500, interestPence: 52_500, type: "PENALTY", lockedThroughDay: 3 });
    expect(accrueLoan({ ...loan, ...day2 }, 3, 3)).toMatchObject({ balancePence: 1_157_625, interestPence: 55_125, lockedThroughDay: 4 });
  });
  it("does not charge the same day twice", () => {
    expect(accrueLoan({ ...loan, lastAccruedDay: 1 }, 1, 0)).toBeNull();
    expect(accrueLoan(null, 1, 0)).toBeNull();
  });
  it("uses full repayment, includes early interest and preserves borrowing lock", () => {
    expect(calculateRepayment(2_000_000, loan)).toEqual({ repaymentPence: 1_050_000, interestPence: 50_000, cashPence: 950_000 });
    expect(calculateRepayment(2_000_000, { ...loan, balancePence: 1_050_000, lastAccruedDay: 1 }).interestPence).toBe(0);
    expect(() => calculateRepayment(1_049_999, loan)).toThrow("full loan repayment");
    expect(() => calculateRepayment(1_000_000, null)).toThrow("no active loan");
    expect(() => calculateBorrow(1_000_000, 100, 3, null, 3)).toThrow("locked");
    expect(calculateBorrow(1_000_000, 100, 4, null, 3).principalPence).toBe(100);
  });
  it.each([0, -1, 1.5, 1_000_001])("rejects an invalid principal %s", (amount) => {
    expect(() => calculateBorrow(1_000_000, amount, 1, null, 0)).toThrow("Borrow between");
  });
  it("enforces one active loan and safe wallet bounds", () => {
    expect(() => calculateBorrow(1_000_000, 100, 1, loan, 0)).toThrow("active loan");
    expect(() => calculateBorrow(2_147_483_647, 1, 1, null, 0)).toThrow("limit");
  });
  it("rounds half a penny upwards", () => {
    expect(loanInterest(10)).toBe(1);
    expect(loanInterest(9)).toBe(0);
    expect(loanInterest(1_102_500)).toBe(55_125);
  });
});
