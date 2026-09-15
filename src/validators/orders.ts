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

export const updateTrackingSchema = z.object({
  carrier: z.string().max(80).optional(),
  trackingNumber: z.string().max(120).optional(),
  trackingUrl: z.string().url().max(500).optional().or(z.literal("")),
});
