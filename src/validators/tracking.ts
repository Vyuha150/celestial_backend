import { z } from "zod";

export const trackPageViewSchema = z.object({
  path: z.string().min(1).max(300),
  referrer: z.string().max(500).optional(),
  utmSource: z.string().max(80).optional(),
});
