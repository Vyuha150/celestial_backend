import { Router } from "express";
import { razorpayWebhook } from "../controllers/webhooksController.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const webhooksRouter = Router();

// Body parsing (raw, for signature verification) is configured in app.ts
// specifically for this route, before the global JSON parser runs.
webhooksRouter.post("/razorpay", asyncHandler(razorpayWebhook));
