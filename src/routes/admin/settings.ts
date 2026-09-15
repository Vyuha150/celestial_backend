import { Router } from "express";
import { getSettings, updateSettings } from "../../controllers/settingsController.js";
import { validateBody } from "../../middlewares/validate.js";
import { updateSettingsSchema } from "../../validators/settings.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const adminSettingsRouter = Router();

adminSettingsRouter.get("/", asyncHandler(getSettings));
adminSettingsRouter.patch("/", validateBody(updateSettingsSchema), asyncHandler(updateSettings));
