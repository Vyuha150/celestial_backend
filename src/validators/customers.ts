import { z } from "zod";

export const listCustomersQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  search: z.string().max(160).optional(),
  tier: z.enum(["Founder", "Member", "Trial"]).optional(),
});

export const updateCustomerSchema = z.object({
  name: z.string().min(1).max(160).optional(),
  tier: z.enum(["Founder", "Member", "Trial"]).optional(),
  phone: z.string().max(20).optional(),
});
