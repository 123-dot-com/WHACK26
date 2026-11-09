import { Router } from "express";
import type { ApiSuccess, HealthDTO } from "@bullish/shared";
import { prisma } from "../lib/prisma.ts";
import { AppError } from "../lib/app-error.ts";

export const healthRouter = Router();

healthRouter.get("/live", (_req, res) => {
  res.json({ success: true, data: { status: "ok" } });
});

healthRouter.get("/", async (_req, res) => {
  // A database connection alone does not mean the game has been initialized.
  const stockCount = await prisma.stock.count({
    where: { id: { in: ["NOVA", "GREEN", "FINX"] } },
  });
  if (stockCount !== 3) {
    throw new AppError(503, "NOT_READY", "The game is temporarily unavailable. Please try again shortly.");
  }

  const body: ApiSuccess<HealthDTO> = {
    success: true,
    data: { status: "ok", database: "connected" },
  };

  res.json(body);
});
