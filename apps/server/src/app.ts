import express from "express";
import cors from "cors";
import { extname } from "node:path";
import { fileURLToPath } from "node:url";
import type { ApiFailure } from "@bullish/shared";
import { env } from "./lib/env.ts";
import { errorHandler } from "./middleware/error-handler.ts";
import { healthRouter } from "./routes/health.routes.ts";
import {gameRouter} from "./routes/game.routes.ts";
export const app = express();

app.disable("x-powered-by");
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json({ limit: "100kb" }));
app.use("/api/health", healthRouter);
app.use("/api/games", gameRouter);

if (env.NODE_ENV === "production") {
  const webRoot = fileURLToPath(new URL("../../web/dist/", import.meta.url));
  app.use(express.static(webRoot));
  app.get("/{*path}", (req, res, next) => {
    // Missing API endpoints and assets must keep their real 404 responses.
    if (req.path === "/api" || req.path.startsWith("/api/") || extname(req.path)) {
      next();
      return;
    }
    res.sendFile("index.html", { root: webRoot });
  });
}

app.use((_req, res) => {
  const body: ApiFailure = {
    success: false,
    error: { code: "NOT_FOUND", message: "This endpoint does not exist." },
  };
  res.status(404).json(body);
});

app.use(errorHandler);
