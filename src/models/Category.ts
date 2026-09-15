import { Schema, model, type InferSchemaType, type Types } from "mongoose";

// Mirrors the marketing-content shape already consumed by the Celestial
// frontend's src/data/products.ts — kept close to that shape so the
// storefront needs minimal changes beyond swapping the data source.
const categorySchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    title: { type: String, required: true, trim: true },
    tagline: { type: String, required: true },
    image: { type: String, required: true },
    heroImage: { type: String },
    heroSprite: {
      url: { type: String },
      frames: { type: Number },
      cols: { type: Number },
      rows: { type: Number },
      aspect: { type: Number },
    },
    items: { type: [String], default: [] },
    hero: {
      eyebrow: { type: String, required: true },
      headline: { type: String, required: true },
      italic: { type: String, required: true },
      pitch: { type: String, required: true },
      badge: { type: String, required: true },
    },
    stats: {
      type: [{ value: String, label: String }],
      default: [],
    },
    benefits: {
      type: [{ icon: String, title: String, body: String }],
      default: [],
    },
    infographic: {
      title: { type: String },
      bars: {
        type: [{ label: String, value: Number, suffix: String }],
        default: [],
      },
    },
    faqs: {
      type: [{ q: String, a: String }],
      default: [],
    },
    social: {
      quote: { type: String },
      by: { type: String },
      role: { type: String },
    },
    status: { type: String, enum: ["published", "draft"], default: "published", index: true },
  },
  { timestamps: true },
);

export type CategoryDoc = InferSchemaType<typeof categorySchema> & { _id: Types.ObjectId };
export const Category = model("Category", categorySchema);
