import { Router } from "express";
import {
  createGameController,
  getGameController,
  getNewsController,
  openMarketController,
  savePredictionController,
} from "../controllers/game.controller.ts";
import { requireGameAccess } from "../middleware/game-access.ts";
import { arbitrageController, bankController, progressionController, puzzleController,
  reportController, tradeController } from "../controllers/gameplay.controller.ts";

export const gameRouter= Router();
gameRouter.post("/",createGameController);
gameRouter.get(
  "/:gameId",
  requireGameAccess,
  getGameController,
);
gameRouter.get(
  "/:gameId/news",
  requireGameAccess,
  getNewsController,
);

gameRouter.post(
  "/:gameId/open-market",
  requireGameAccess,
  openMarketController,
);

gameRouter.post(
  "/:gameId/prediction",
  requireGameAccess,
  savePredictionController,
);

gameRouter.post("/:gameId/trades", requireGameAccess, tradeController);
gameRouter.post("/:gameId/bank/deposit", requireGameAccess, bankController("DEPOSIT"));
gameRouter.post("/:gameId/bank/withdraw", requireGameAccess, bankController("WITHDRAW"));
gameRouter.get("/:gameId/arbitrage", requireGameAccess, puzzleController);
gameRouter.post("/:gameId/arbitrage/execute", requireGameAccess, arbitrageController);
gameRouter.post("/:gameId/end-day", requireGameAccess, progressionController("end-day"));
gameRouter.post("/:gameId/next-day", requireGameAccess, progressionController("next-day"));
gameRouter.post("/:gameId/reset", requireGameAccess, progressionController("reset"));
gameRouter.get("/:gameId/reports/:day", requireGameAccess, reportController);
