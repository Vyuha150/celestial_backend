import { Router } from "express";
import { getCart, addCartItem, updateCartItem, removeCartItem } from "../controllers/cartController.js";
import { validateBody } from "../middlewares/validate.js";
import { addCartItemSchema, updateCartItemSchema } from "../validators/cart.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const cartRouter = Router();

cartRouter.get("/", asyncHandler(getCart));
cartRouter.post("/items", validateBody(addCartItemSchema), asyncHandler(addCartItem));
cartRouter.patch("/items/:productId", validateBody(updateCartItemSchema), asyncHandler(updateCartItem));
cartRouter.delete("/items/:productId", asyncHandler(removeCartItem));
