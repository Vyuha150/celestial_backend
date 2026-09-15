import { Schema, model, type InferSchemaType, type Types } from "mongoose";

const inventoryLogSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    change: { type: Number, required: true }, // negative = decrement, positive = restock
    balanceAfter: { type: Number, required: true },
    reason: { type: String, enum: ["order", "restock", "adjustment", "cancellation"], required: true },
    order: { type: Schema.Types.ObjectId, ref: "Order", default: null },
    actor: { type: Schema.Types.ObjectId, ref: "User", default: null },
    note: { type: String },
  },
  { timestamps: true },
);

export type InventoryLogDoc = InferSchemaType<typeof inventoryLogSchema> & { _id: Types.ObjectId };
export const InventoryLog = model("InventoryLog", inventoryLogSchema);
