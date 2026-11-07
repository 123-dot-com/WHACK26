import {Router} from "express";
import {createGameController} from "../controllers/game.controller.ts";

export const gameRouter= Router();
gameRouter.post("/",createGameController);