import { AppError } from "./app-error.ts";

export const MAX_DATABASE_INTEGER = 2_147_483_647;

export function checkedPence(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0 || value > MAX_DATABASE_INTEGER) {
    throw new AppError(422, "AMOUNT_OUT_OF_RANGE", "This amount exceeds the game's balance limit.");
  }
  return value;
}
