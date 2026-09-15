import type { AccessTokenPayload } from "../utils/jwt.js";

declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
      rawBody?: string;
      validatedQuery?: unknown;
      cartSessionId?: string;
    }
  }
}

export {};
