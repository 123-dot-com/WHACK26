import type { ErrorRequestHandler } from "express";
import type { ApiFailure } from "@bullish/shared";
import { ZodError } from "zod";
import { AppError } from "../lib/app-error.ts";
export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  if (res.headersSent) {
    _next(error);
    return;
  }
  if (error instanceof AppError) {
  res.status(error.status).json({
    success: false,
    error: {
      code: error.code,
      message: error.message,
    },
  });
  return;
}

  const invalidJson = error instanceof SyntaxError
    && "status" in error && error.status === 400;
  const invalidRequest = error instanceof ZodError || invalidJson;

  if (!invalidRequest) console.error(error);

  const body: ApiFailure = {
    success: false,
    error: {
      code: error instanceof ZodError && error.issues.some((issue) => issue.path[0] === "quantity")
        ? "INVALID_QUANTITY"
        : error instanceof ZodError && error.issues.some((issue) => issue.path[0] === "stockId")
          ? "INVALID_STOCK" : invalidRequest ? "INVALID_REQUEST" : "INTERNAL_SERVER_ERROR",
      message: invalidRequest ? "The request is invalid." : "The request could not be completed.",
    },
  };

  res.status(invalidRequest ? 400 : 500).json(body);
};
