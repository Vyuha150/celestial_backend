import { Router } from "express";
import {
  listCustomersAdmin,
  getCustomerAdmin,
  updateCustomerAdmin,
  deleteCustomerAdmin,
} from "../../controllers/customersController.js";
import { validateBody, validateQuery } from "../../middlewares/validate.js";
import { listCustomersQuerySchema, updateCustomerSchema } from "../../validators/customers.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const adminCustomersRouter = Router();

adminCustomersRouter.get("/", validateQuery(listCustomersQuerySchema), asyncHandler(listCustomersAdmin));
adminCustomersRouter.get("/:id", asyncHandler(getCustomerAdmin));
adminCustomersRouter.patch("/:id", validateBody(updateCustomerSchema), asyncHandler(updateCustomerAdmin));
adminCustomersRouter.delete("/:id", asyncHandler(deleteCustomerAdmin));
