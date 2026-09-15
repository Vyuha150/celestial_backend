import { z } from "zod";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");

export const createProductSchema = z.object({
  category: objectId,
  sku: z.string().min(1).max(40).optional(),
  name: z.string().min(1).max(160),
  cadence: z.string().max(40).default("/ one-time"),
  price: z.number().min(0),
  compareAtPrice: z.number().min(0).optional(),
  stock: z.number().int().min(0).default(0),
  status: z.enum(["live", "draft", "archived"]).default("draft"),
  images: z.array(z.string()).max(10).default([]),
  perks: z.array(z.string().max(200)).max(20).default([]),
  highlight: z.boolean().default(false),
  cta: z.string().max(60).default("Order now"),
});

export const updateProductSchema = createProductSchema.partial();

export const listProductsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  category: z.string().optional(),
  status: z.enum(["live", "draft", "archived"]).optional(),
  search: z.string().max(120).optional(),
});

export const stockAdjustSchema = z.object({
  change: z.number().int().refine((v) => v !== 0, "change must be non-zero"),
  reason: z.enum(["restock", "adjustment"]),
  note: z.string().max(300).optional(),
});
