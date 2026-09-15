import { Schema, model, type InferSchemaType, type Types } from "mongoose";

const pageSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    title: { type: String, required: true, trim: true },
    route: { type: String, required: true, unique: true, trim: true },
    status: { type: String, enum: ["published", "draft"], default: "draft", index: true },
  },
  { timestamps: true },
);

export type PageDoc = InferSchemaType<typeof pageSchema> & { _id: Types.ObjectId };
export const Page = model("Page", pageSchema);
