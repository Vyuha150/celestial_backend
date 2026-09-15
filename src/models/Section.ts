import { Schema, model, type InferSchemaType, type Types } from "mongoose";

const sectionSchema = new Schema(
  {
    pageSlug: { type: String, required: true, index: true },
    pageTitle: { type: String, required: true }, // denormalized for admin list display
    key: { type: String, required: true, trim: true },
    heading: { type: String },
    body: { type: String, maxlength: 20000 },
  },
  { timestamps: true },
);

sectionSchema.index({ pageSlug: 1, key: 1 }, { unique: true });

export type SectionDoc = InferSchemaType<typeof sectionSchema> & { _id: Types.ObjectId };
export const Section = model("Section", sectionSchema);
