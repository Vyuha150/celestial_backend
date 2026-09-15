import jwt from "jsonwebtoken";
import { createHash, randomUUID } from "node:crypto";
import { env } from "../config/env.js";
import { RefreshToken } from "../models/RefreshToken.js";

export type AccessTokenPayload = { sub: string; role: "admin" | "customer" };
type RefreshTokenPayload = { sub: string; tokenId: string };

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.ACCESS_EXPIRES_IN as jwt.SignOptions["expiresIn"] });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function parseExpiresToMs(spec: string): number {
  const match = /^(\d+)([smhd])$/.exec(spec);
  if (!match) return 30 * 24 * 60 * 60 * 1000;
  const value = Number(match[1]);
  const unit = match[2];
  const unitMs = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit as "s" | "m" | "h" | "d"];
  return value * unitMs;
}

// Issues a new refresh token, persisting only its hash (never the raw
// value) so a leaked DB dump can't be replayed as a live session.
export async function issueRefreshToken(userId: string): Promise<string> {
  const tokenId = randomUUID();
  const raw = jwt.sign({ sub: userId, tokenId } satisfies RefreshTokenPayload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.REFRESH_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });

  await RefreshToken.create({
    user: userId,
    tokenHash: hashToken(raw),
    expiresAt: new Date(Date.now() + parseExpiresToMs(env.REFRESH_EXPIRES_IN)),
  });

  return raw;
}

// Verifies signature + DB record, then rotates: revokes the old record and
// issues a fresh pair. Returns null if the token is invalid, expired, or
// already revoked (reuse of a revoked token — treat as a possible theft).
export async function rotateRefreshToken(
  raw: string,
): Promise<{ userId: string; accessToken: string; refreshToken: string } | null> {
  let payload: RefreshTokenPayload;
  try {
    payload = jwt.verify(raw, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
  } catch {
    return null;
  }

  const record = await RefreshToken.findOne({ user: payload.sub, tokenHash: hashToken(raw) });
  if (!record || record.revokedAt || record.expiresAt < new Date()) {
    return null;
  }

  record.revokedAt = new Date();
  await record.save();

  const { User } = await import("../models/User.js");
  const user = await User.findById(payload.sub);
  if (!user) return null;

  const accessToken = signAccessToken({ sub: String(user._id), role: user.role as "admin" | "customer" });
  const refreshToken = await issueRefreshToken(String(user._id));

  return { userId: String(user._id), accessToken, refreshToken };
}

export async function revokeRefreshToken(raw: string): Promise<void> {
  await RefreshToken.updateOne({ tokenHash: hashToken(raw) }, { $set: { revokedAt: new Date() } });
}
