import { z } from "zod";

const statBlock = z.object({ value: z.string(), label: z.string() });
const benefitBlock = z.object({ icon: z.string(), title: z.string(), body: z.string() });
const barBlock = z.object({ label: z.string(), value: z.number(), suffix: z.string().optional() });
const faqBlock = z.object({ q: z.string(), a: z.string() });

export const createCategorySchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "slug must be lowercase, numbers, and hyphens only"),
  title: z.string().min(1).max(160),
  tagline: z.string().min(1).max(400),
  image: z.string().min(1),
  heroImage: z.string().optional(),
  heroSprite: z
    .object({
      url: z.string(),
      frames: z.number().int().positive(),
      cols: z.number().int().positive(),
      rows: z.number().int().positive(),
      aspect: z.number().positive(),
    })
    .optional(),
  items: z.array(z.string().max(120)).max(30).default([]),
  hero: z.object({
    eyebrow: z.string().max(80),
    headline: z.string().max(160),
    italic: z.string().max(160),
    pitch: z.string().max(500),
    badge: z.string().max(120),
  }),
  stats: z.array(statBlock).max(10).default([]),
  benefits: z.array(benefitBlock).max(10).default([]),
  infographic: z
    .object({ title: z.string().optional(), bars: z.array(barBlock).max(10).default([]) })
    .optional(),
  faqs: z.array(faqBlock).max(20).default([]),
  social: z
    .object({ quote: z.string().optional(), by: z.string().optional(), role: z.string().optional() })
    .optional(),
  status: z.enum(["published", "draft"]).default("published"),
});

export const updateCategorySchema = createCategorySchema.partial();
