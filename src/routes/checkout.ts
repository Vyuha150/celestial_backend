import { Router } from "express";
import { createCheckoutSession, verifyPayment } from "../controllers/checkoutController.js";
import { validateBody } from "../middlewares/validate.js";
import { createCheckoutSessionSchema, verifyPaymentSchema } from "../validators/checkout.js";
import { checkoutLimiter } from "../middlewares/rateLimit.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const checkoutRouter = Router();

checkoutRouter.post(
  "/session",
  checkoutLimiter,
  validateBody(createCheckoutSessionSchema),
  asyncHandler(createCheckoutSession),
);
checkoutRouter.post("/verify", checkoutLimiter, validateBody(verifyPaymentSchema), asyncHandler(verifyPayment));
