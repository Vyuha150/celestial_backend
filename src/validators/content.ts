import { z } from "zod";

export const createPageSchema = z.object({
  slug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/),
  title: z.string().min(1).max(160),
  route: z.string().min(1).max(200),
  status: z.enum(["published", "draft"]).default("draft"),
});

export const updatePageSchema = createPageSchema.partial();

export const upsertSectionSchema = z.object({
  pageSlug: z.string().min(1).max(80),
  pageTitle: z.string().min(1).max(160),
  key: z.string().min(1).max(80),
  heading: z.string().max(200).optional(),
  body: z.string().max(20000).optional(),
});
