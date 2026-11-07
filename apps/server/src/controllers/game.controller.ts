import type { Request, Response } from "express";
import { createGame, getGame, getNews} from "../services/game.service.ts";

export async function createGameController(
    _req: Request,
    res: Response,
) {
    const {game, accessToken} = await createGame();

    res.status(201).json({
        success: true,
        data: {
        ...game,
        accessToken,
    },
        stateVersion: game.version,
    });
}

export async function getGameController(
  req: Request<{ gameId: string }>,
  res: Response,
) {
  const game = await getGame(req.params.gameId);

  if (!game) {
    res.status(404).json({
      success: false,
      error: {
        code: "NOT_FOUND",
        message: "Game not found.",
      },
    });
    return;
  }

  res.json({
    success: true,
    data: game,
    stateVersion: game.version,
  });
}

export async function getNewsController(
  req: Request<{ gameId: string }>,
  res: Response,
) {
  const result = await getNews(req.params.gameId);

  if (!result) {
    res.status(404).json({
      success: false,
      error: {
        code: "NOT_FOUND",
        message: "Game not found.",
      },
    });
    return;
  }

  res.json({
    success: true,
    data: result.news,
    stateVersion: result.version,
  });
}