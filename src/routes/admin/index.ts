import { Router } from "express";
import { requireAuth, requireAdmin } from "../../middlewares/auth.js";
import { adminProductsRouter } from "./products.js";
import { adminCategoriesRouter } from "./categories.js";
import { adminOrdersRouter } from "./orders.js";
import { adminCustomersRouter } from "./customers.js";
import { adminContentRouter } from "./content.js";
import { adminSettingsRouter } from "./settings.js";
import { adminAnalyticsRouter } from "./analytics.js";

export const adminRouter = Router();

// Every admin route requires a valid admin session — applied once here.
adminRouter.use(requireAuth, requireAdmin);

adminRouter.use("/products", adminProductsRouter);
adminRouter.use("/categories", adminCategoriesRouter);
adminRouter.use("/orders", adminOrdersRouter);
adminRouter.use("/customers", adminCustomersRouter);
adminRouter.use("/content", adminContentRouter);
adminRouter.use("/settings", adminSettingsRouter);
adminRouter.use("/analytics", adminAnalyticsRouter);
