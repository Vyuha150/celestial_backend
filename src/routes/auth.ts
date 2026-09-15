import { Router } from "express";
import { login, refresh, logout, bootstrapAdmin, me } from "../controllers/authController.js";
import { validateBody } from "../middlewares/validate.js";
import { loginSchema, refreshSchema, bootstrapAdminSchema } from "../validators/auth.js";
import { requireAuth } from "../middlewares/auth.js";
import { loginLimiter } from "../middlewares/rateLimit.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const authRouter = Router();

authRouter.post("/login", loginLimiter, validateBody(loginSchema), asyncHandler(login));
authRouter.post("/refresh", validateBody(refreshSchema), asyncHandler(refresh));
authRouter.post("/logout", validateBody(refreshSchema), asyncHandler(logout));
authRouter.post("/bootstrap-admin", loginLimiter, validateBody(bootstrapAdminSchema), asyncHandler(bootstrapAdmin));
authRouter.get("/me", requireAuth, asyncHandler(me));
