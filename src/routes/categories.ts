import { Router } from "express";
import { listCategories, getCategoryBySlug } from "../controllers/categoriesController.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const categoriesRouter = Router();

categoriesRouter.get("/", asyncHandler(listCategories));
categoriesRouter.get("/:slug", asyncHandler(getCategoryBySlug));
