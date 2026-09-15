import { Schema, model, type InferSchemaType, type Types } from "mongoose";

// Single-document key/value store backing admin.settings.tsx (store name,
// currency, timezone, feature flags). One row, upserted on save.
const settingSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, default: "store" },
    storeName: { type: String, default: "Celestial" },
    currency: { type: String, default: "USD" },
    supportEmail: { type: String, default: "" },
    timezone: { type: String, default: "UTC" },
    features: {
      maintenance: { type: Boolean, default: false },
      abandonedCart: { type: Boolean, default: true },
      referrals: { type: Boolean, default: false },
      transactionalEmails: { type: Boolean, default: true },
    },
  },
  { timestamps: true },
);

export type SettingDoc = InferSchemaType<typeof settingSchema> & { _id: Types.ObjectId };
export const Setting = model("Setting", settingSchema);
