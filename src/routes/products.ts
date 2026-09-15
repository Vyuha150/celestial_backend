import { Router } from "express";
import { listProductsPublic } from "../controllers/productsController.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const productsRouter = Router();

productsRouter.get("/", asyncHandler(listProductsPublic));
