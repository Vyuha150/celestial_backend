import { Router } from "express";
import { trackPageView } from "../controllers/trackingController.js";
import { validateBody } from "../middlewares/validate.js";
import { trackPageViewSchema } from "../validators/tracking.js";
import { generalLimiter } from "../middlewares/rateLimit.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const trackingRouter = Router();

trackingRouter.post("/pageview", generalLimiter, validateBody(trackPageViewSchema), asyncHandler(trackPageView));
