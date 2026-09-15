import { z } from "zod";

export const listOrdersQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  status: z.enum(["pending", "paid", "shipped", "delivered", "refunded", "cancelled"]).optional(),
  search: z.string().max(160).optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(["pending", "paid", "shipped", "delivered", "refunded", "cancelled"]),
  note: z.string().max(300).optional(),
});
