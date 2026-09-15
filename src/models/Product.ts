import { Schema, model, type InferSchemaType, type Types } from "mongoose";

// A Product is the real, purchasable SKU — what used to be a free-text
// "tier" (e.g. "Quarterly Protocol — $890") on a Category. Each pricing
// tier becomes one Product row here, with a real numeric price/stock.
// `sales30d` shown in the admin table is computed on read from Order
// aggregates (see analyticsController) rather than denormalized here,
// so it can never drift out of sync with real orders.
const productSchema = new Schema(
  {
    category: { type: Schema.Types.ObjectId, ref: "Category", required: true, index: true },
    sku: { type: String, required: true, unique: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    cadence: { type: String, default: "/ one-time" },
    price: { type: Number, required: true, min: 0 },
    compareAtPrice: { type: Number, min: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    status: { type: String, enum: ["live", "draft", "archived"], default: "draft", index: true },
    images: { type: [String], default: [] },
    perks: { type: [String], default: [] },
    highlight: { type: Boolean, default: false },
    cta: { type: String, default: "Order now" },
  },
  { timestamps: true },
);

productSchema.index({ name: "text", sku: "text" });

export type ProductDoc = InferSchemaType<typeof productSchema> & { _id: Types.ObjectId };
export const Product = model("Product", productSchema);
