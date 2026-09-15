import { Router } from "express";
import { listPublishedPages, listPublishedSections } from "../controllers/contentController.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const contentRouter = Router();

contentRouter.get("/pages", asyncHandler(listPublishedPages));
contentRouter.get("/sections", asyncHandler(listPublishedSections));
