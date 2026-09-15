import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../utils/jwt.js";
import { ApiError } from "../utils/ApiError.js";

// Trusts the role embedded in the (short-lived, 15min) access token rather
// than re-fetching the User on every request — a deliberate trade-off:
// zero DB round-trip per request, at the cost of up to 15min staleness if
// an admin's role is revoked mid-session (acceptable for this scale).
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    next(ApiError.unauthorized("Missing bearer token"));
    return;
  }

  try {
    req.user = verifyAccessToken(header.slice(7));
    next();
  } catch {
    next(ApiError.unauthorized("Invalid or expired token"));
  }
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.role !== "admin") {
    next(ApiError.forbidden("Admin access required"));
    return;
  }
  next();
}
