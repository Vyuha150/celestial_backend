import { Router } from "express";
import {
  listCategoriesAdmin,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../../controllers/categoriesController.js";
import { validateBody } from "../../middlewares/validate.js";
import { createCategorySchema, updateCategorySchema } from "../../validators/categories.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const adminCategoriesRouter = Router();

adminCategoriesRouter.get("/", asyncHandler(listCategoriesAdmin));
adminCategoriesRouter.post("/", validateBody(createCategorySchema), asyncHandler(createCategory));
adminCategoriesRouter.patch("/:id", validateBody(updateCategorySchema), asyncHandler(updateCategory));
adminCategoriesRouter.delete("/:id", asyncHandler(deleteCategory));
