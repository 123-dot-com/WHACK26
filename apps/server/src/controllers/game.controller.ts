import type {Request, Response } from "express";
import {createGame} from "../services/game.service.ts";

export async function createGameController(
    _req: Request,
    res: Response,
){
    const game= await createGame();

    res.status(201).json({
        success: true,
        data:game,
        stateVersion:game.version,
    });
}