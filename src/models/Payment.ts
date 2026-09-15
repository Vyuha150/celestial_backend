import { Schema, model, type InferSchemaType, type Types } from "mongoose";

// Audit trail of every payment event (order creation, webhook deliveries,
// verify calls) — kept separate from Order so a full raw history survives
// even if the order's own status fields get overwritten.
const paymentSchema = new Schema(
  {
    order: { type: Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    provider: { type: String, default: "razorpay" },
    providerOrderId: { type: String, index: true },
    providerPaymentId: { type: String, index: true },
    event: { type: String, required: true }, // e.g. "order.created", "payment.captured", "webhook.payment.failed"
    status: { type: String, required: true },
    amount: { type: Number },
    rawPayload: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

export type PaymentDoc = InferSchemaType<typeof paymentSchema> & { _id: Types.ObjectId };
export const Payment = model("Payment", paymentSchema);
