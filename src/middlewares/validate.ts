import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny } from "zod";
import { ApiError } from "../utils/ApiError.js";

export function validateBody(schema: ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(ApiError.badRequest("Validation failed", result.error.flatten()));
      return;
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery(schema: ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      next(ApiError.badRequest("Validation failed", result.error.flatten()));
      return;
    }
    // req.query is technically read-only in newer @types/express; store parsed value separately.
    req.validatedQuery = result.data;
    next();
  };
}
