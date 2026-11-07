import {Router} from "express";
import {createGameController, getGameController, getNewsController, openMarketController} from "../controllers/game.controller.ts";
import {requireGameAccess} from "../middleware/game-access.ts";

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