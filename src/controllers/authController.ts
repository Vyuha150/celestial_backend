import type { Request, Response } from "express";
import { User } from "../models/User.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { signAccessToken, issueRefreshToken, rotateRefreshToken, revokeRefreshToken } from "../utils/jwt.js";
import { ApiError } from "../utils/ApiError.js";

export async function login(req: Request, res: Response) {
  const { email, password } = req.body as { email: string; password: string };

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  const accessToken = signAccessToken({ sub: String(user._id), role: user.role as "admin" | "customer" });
  const refreshToken = await issueRefreshToken(String(user._id));

  res.json({
    accessToken,
    refreshToken,
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  });
}

export async function refresh(req: Request, res: Response) {
  const { refreshToken } = req.body as { refreshToken: string };

  const result = await rotateRefreshToken(refreshToken);
  if (!result) {
    throw ApiError.unauthorized("Invalid or expired refresh token");
  }

  res.json({ accessToken: result.accessToken, refreshToken: result.refreshToken });
}

export async function logout(req: Request, res: Response) {
  const { refreshToken } = req.body as { refreshToken: string };
  await revokeRefreshToken(refreshToken);
  res.status(204).send();
}

// One-time setup endpoint: creates the first admin account. Refuses once
// any admin already exists, and compares bootstrap credentials in
// constant time to avoid a timing side-channel.
export async function bootstrapAdmin(req: Request, res: Response) {
  const { name, email, password } = req.body as { name: string; email: string; password: string };

  const existingAdmin = await User.exists({ role: "admin" });
  if (existingAdmin) {
    throw ApiError.conflict("An admin account already exists");
  }

  const { env } = await import("../config/env.js");
  const { timingSafeStringEqual } = await import("../utils/password.js");

  const emailMatches = timingSafeStringEqual(email.toLowerCase(), env.ADMIN_BOOTSTRAP_EMAIL.toLowerCase());
  const passwordMatches = timingSafeStringEqual(password, env.ADMIN_BOOTSTRAP_PASSWORD);
  if (!emailMatches || !passwordMatches) {
    throw ApiError.forbidden("Credentials do not match the configured bootstrap admin");
  }

  const passwordHash = await hashPassword(password);
  const user = await User.create({ name, email: email.toLowerCase(), passwordHash, role: "admin", tier: "Founder" });

  res.status(201).json({ id: user._id, name: user.name, email: user.email, role: user.role });
}

export async function me(req: Request, res: Response) {
  const user = await User.findById(req.user!.sub).select("-passwordHash");
  if (!user) throw ApiError.notFound("User not found");
  res.json(user);
}
