import { Router } from "express";
import type { ApiSuccess, HealthDTO } from "@bullish/shared";
import { prisma } from "../lib/prisma.ts";

export const healthRouter = Router();

healthRouter.get("/live", (_req, res) => {
  res.json({ success: true, data: { status: "ok" } });
});

healthRouter.get("/", async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`;

  const body: ApiSuccess<HealthDTO> = {
    success: true,
    data: { status: "ok", database: "connected" },
  };

  res.json(body);
});
