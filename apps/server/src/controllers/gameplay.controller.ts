import type { Request, Response } from "express";
import { arbitrageRequestSchema, bankTransferRequestSchema, idempotencyKeySchema,
  tradeRequestSchema, versionRequestSchema, borrowRequestSchema } from "@bullish/shared";
import { z } from "zod";
import { executeArbitrage, getArbitrageMarket } from "../services/arbitrage.service.ts";
import { transferMoney } from "../services/bank.service.ts";
import { endDay, getReport, nextDay, reset } from "../services/progression.service.ts";
import { executeTrade } from "../services/trading.service.ts";
import { borrow, repay } from "../services/loan.service.ts";
import { getLeaderboard } from "../services/leaderboard.service.ts";

type GameRequest = Request<{ gameId: string }>;
const requestKey = (req: Request) => idempotencyKeySchema.parse(req.get("Idempotency-Key"));

export async function leaderboardController(req: GameRequest, res: Response) {
  const result = await getLeaderboard(req.params.gameId);
  res.json({ success: true, data: result.leaderboard, stateVersion: result.version });
}

export async function borrowController(req: GameRequest, res: Response) {
  res.json(await borrow(req.params.gameId, borrowRequestSchema.parse(req.body), requestKey(req)));
}

export async function repayController(req: GameRequest, res: Response) {
  res.json(await repay(req.params.gameId, versionRequestSchema.parse(req.body), requestKey(req)));
}

export async function tradeController(req: GameRequest, res: Response) {
  res.json(await executeTrade(req.params.gameId, tradeRequestSchema.parse(req.body), requestKey(req)));
}

export function bankController(operation: "DEPOSIT" | "WITHDRAW") {
  return async (req: GameRequest, res: Response) => {
    res.json(await transferMoney(req.params.gameId, bankTransferRequestSchema.parse(req.body), requestKey(req), operation));
  };
}

export async function puzzleController(req: GameRequest, res: Response) {
  const result = await getArbitrageMarket(req.params.gameId);
  res.json({ success: true, data: result.market, stateVersion: result.version });
}

export async function arbitrageController(req: GameRequest, res: Response) {
  res.json(await executeArbitrage(req.params.gameId, arbitrageRequestSchema.parse(req.body), requestKey(req)));
}

export function progressionController(action: "end-day" | "next-day" | "reset") {
  const service = { "end-day": endDay, "next-day": nextDay, reset }[action];
  return async (req: GameRequest, res: Response) => {
    res.json(await service(req.params.gameId, versionRequestSchema.parse(req.body), requestKey(req)));
  };
}

export async function reportController(req: Request<{ gameId: string; day: string }>, res: Response) {
  const day = z.coerce.number().int().min(1).max(3).parse(req.params.day);
  const result = await getReport(req.params.gameId, day);
  res.json({ success: true, data: result.report, stateVersion: result.version });
}
