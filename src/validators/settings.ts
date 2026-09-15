import { z } from "zod";

export const updateSettingsSchema = z.object({
  storeName: z.string().min(1).max(120).optional(),
  currency: z.string().length(3).optional(),
  supportEmail: z.string().email().optional().or(z.literal("")),
  timezone: z.string().min(1).max(60).optional(),
  features: z
    .object({
      maintenance: z.boolean().optional(),
      abandonedCart: z.boolean().optional(),
      referrals: z.boolean().optional(),
      transactionalEmails: z.boolean().optional(),
    })
    .optional(),
});
