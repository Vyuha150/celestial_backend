import { Schema, model, type InferSchemaType, type Types } from "mongoose";

// Minimal first-party pageview log — just enough to make the admin
// analytics dashboard's traffic-source chart and purchase funnel real
// instead of hardcoded numbers, without pulling in a full analytics SaaS.
const pageViewSchema = new Schema(
  {
    sessionId: { type: String, required: true, index: true },
    path: { type: String, required: true },
    referrer: { type: String },
    source: {
      type: String,
      enum: ["Direct", "Organic", "Referral", "Email", "Social"],
      default: "Direct",
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

pageViewSchema.index({ createdAt: -1 });
pageViewSchema.index({ path: 1, createdAt: -1 });

export type PageViewDoc = InferSchemaType<typeof pageViewSchema> & { _id: Types.ObjectId };
export const PageView = model("PageView", pageViewSchema);
