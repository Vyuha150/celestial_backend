import { Schema, model, type InferSchemaType, type Types } from "mongoose";

const orderItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    category: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    qty: { type: Number, required: true, min: 1 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const statusHistorySchema = new Schema(
  {
    status: { type: String, required: true },
    changedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    changedAt: { type: Date, default: () => new Date() },
    note: { type: String },
  },
  { _id: false },
);

const orderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    customer: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true, lowercase: true, index: true },
    shippingAddress: {
      line1: String,
      line2: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
      phone: String,
    },
    items: { type: [orderItemSchema], required: true, validate: (v: unknown[]) => v.length > 0 },
    itemCount: { type: Number, required: true },
    total: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["pending", "paid", "shipped", "delivered", "refunded", "cancelled"],
      default: "pending",
      index: true,
    },
    statusHistory: { type: [statusHistorySchema], default: [] },
    paymentProvider: { type: String, default: "razorpay" },
    paymentStatus: {
      type: String,
      enum: ["created", "authorized", "captured", "failed", "refunded"],
      default: "created",
    },
    razorpayOrderId: { type: String, index: true },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },
    paidAt: { type: Date },
  },
  { timestamps: true },
);

orderSchema.index({ customerEmail: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });

export type OrderDoc = InferSchemaType<typeof orderSchema> & { _id: Types.ObjectId };
export const Order = model("Order", orderSchema);
