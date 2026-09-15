import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { env } from "../config/env.js";

const COOKIE_NAME = "celestial_cart";
const isProd = env.NODE_ENV === "production";

// Guest carts don't require login — identified by an opaque, httpOnly
// cookie so client JS can't read/tamper with it directly. Cross-origin
// (Cloudflare frontend -> VPS API) requires SameSite=None + Secure, which
// only works over HTTPS — so this falls back to Lax/insecure in dev.
export function cartSession(req: Request, res: Response, next: NextFunction) {
  let sessionId = req.cookies?.[COOKIE_NAME] as string | undefined;
  if (!sessionId) {
    sessionId = randomUUID();
    res.cookie(COOKIE_NAME, sessionId, {
      httpOnly: true,
      sameSite: isProd ? "none" : "lax",
      secure: isProd,
      maxAge: 90 * 24 * 60 * 60 * 1000,
    });
  }
  req.cartSessionId = sessionId;
  next();
}
