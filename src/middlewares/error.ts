import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/ApiError.js";
import { logger } from "../config/logger.js";

export function notFoundHandler(_req: Request, _res: Response, next: NextFunction) {
  next(ApiError.notFound("Route not found"));
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    if (err.status >= 500) {
      logger.error({ err, path: req.path }, err.message);
    }
    res.status(err.status).json({ error: err.message, details: err.details });
    return;
  }

  // Unknown/unexpected error — always logged (the sibling backend silently
  // swallowed these, making production issues invisible).
  logger.error({ err, path: req.path, method: req.method }, "Unhandled error");
  res.status(500).json({ error: "Internal server error" });
}
