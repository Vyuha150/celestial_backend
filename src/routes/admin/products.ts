import { Router } from "express";
import {
  listProductsAdmin,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  adjustStock,
  uploadProductImages,
} from "../../controllers/productsController.js";
import { validateBody, validateQuery } from "../../middlewares/validate.js";
import { createProductSchema, updateProductSchema, listProductsQuerySchema, stockAdjustSchema } from "../../validators/products.js";
import { uploadProductImage } from "../../middlewares/upload.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const adminProductsRouter = Router();

adminProductsRouter.get("/", validateQuery(listProductsQuerySchema), asyncHandler(listProductsAdmin));
adminProductsRouter.get("/:id", asyncHandler(getProduct));
adminProductsRouter.post("/", validateBody(createProductSchema), asyncHandler(createProduct));
adminProductsRouter.patch("/:id", validateBody(updateProductSchema), asyncHandler(updateProduct));
adminProductsRouter.delete("/:id", asyncHandler(deleteProduct));
adminProductsRouter.post("/:id/stock", validateBody(stockAdjustSchema), asyncHandler(adjustStock));
adminProductsRouter.post("/:id/images", uploadProductImage.array("images", 6), asyncHandler(uploadProductImages));
