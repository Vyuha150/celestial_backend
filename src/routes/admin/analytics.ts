import { Router } from "express";
import { getDashboard, getOverview, getCohortRetention, getFunnel } from "../../controllers/analyticsController.js";
import { validateQuery } from "../../middlewares/validate.js";
import { analyticsRangeQuerySchema } from "../../validators/analytics.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const adminAnalyticsRouter = Router();

adminAnalyticsRouter.get("/dashboard", asyncHandler(getDashboard));
adminAnalyticsRouter.get("/overview", validateQuery(analyticsRangeQuerySchema), asyncHandler(getOverview));
adminAnalyticsRouter.get("/cohorts", asyncHandler(getCohortRetention));
adminAnalyticsRouter.get("/funnel", asyncHandler(getFunnel));
