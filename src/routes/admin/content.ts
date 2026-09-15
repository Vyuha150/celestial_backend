import { Router } from "express";
import {
  listPagesAdmin,
  createPage,
  updatePage,
  deletePage,
  listSectionsAdmin,
  upsertSection,
  deleteSection,
} from "../../controllers/contentController.js";
import { validateBody } from "../../middlewares/validate.js";
import { createPageSchema, updatePageSchema, upsertSectionSchema } from "../../validators/content.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const adminContentRouter = Router();

adminContentRouter.get("/pages", asyncHandler(listPagesAdmin));
adminContentRouter.post("/pages", validateBody(createPageSchema), asyncHandler(createPage));
adminContentRouter.patch("/pages/:slug", validateBody(updatePageSchema), asyncHandler(updatePage));
adminContentRouter.delete("/pages/:slug", asyncHandler(deletePage));

adminContentRouter.get("/sections", asyncHandler(listSectionsAdmin));
adminContentRouter.post("/sections", validateBody(upsertSectionSchema), asyncHandler(upsertSection));
adminContentRouter.delete("/sections/:id", asyncHandler(deleteSection));
