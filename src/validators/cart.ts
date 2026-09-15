import { z } from "zod";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");

export const addCartItemSchema = z.object({
  productId: objectId,
  qty: z.number().int().min(1).max(99).default(1),
});

export const updateCartItemSchema = z.object({
  qty: z.number().int().min(1).max(99),
});
