import { Schema, model, type InferSchemaType, type Types } from "mongoose";

const cartItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    qty: { type: Number, required: true, min: 1, max: 99 },
  },
  { _id: false },
);

const cartSchema = new Schema(
  {
    sessionId: { type: String, required: true, unique: true },
    user: { type: Schema.Types.ObjectId, ref: "User", default: null },
    items: { type: [cartItemSchema], default: [] },
    expiresAt: { type: Date, required: true }, // TTL index declared below
  },
  { timestamps: true },
);

// Guest carts self-clean via TTL — abandoned-cart reporting reads recently
// updated, still-live carts before they expire (see analyticsController).
cartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type CartDoc = InferSchemaType<typeof cartSchema> & { _id: Types.ObjectId };
export const Cart = model("Cart", cartSchema);
