import { Router } from "express";
import {
  listOrdersAdmin,
  getOrderAdmin,
  updateOrderStatus,
  deleteOrder,
  refreshOrderPayment,
} from "../../controllers/ordersController.js";
import { validateBody, validateQuery } from "../../middlewares/validate.js";
import { listOrdersQuerySchema, updateOrderStatusSchema } from "../../validators/orders.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const adminOrdersRouter = Router();

adminOrdersRouter.get("/", validateQuery(listOrdersQuerySchema), asyncHandler(listOrdersAdmin));
adminOrdersRouter.get("/:id", asyncHandler(getOrderAdmin));
adminOrdersRouter.patch("/:id/status", validateBody(updateOrderStatusSchema), asyncHandler(updateOrderStatus));
adminOrdersRouter.delete("/:id", asyncHandler(deleteOrder));
adminOrdersRouter.post("/:id/refresh-payment", asyncHandler(refreshOrderPayment));
