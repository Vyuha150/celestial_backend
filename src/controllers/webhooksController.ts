import type { Request, Response } from "express";
import { Order } from "../models/Order.js";
import { Payment } from "../models/Payment.js";
import { verifyWebhookSignature } from "../utils/razorpay.js";
import { ApiError } from "../utils/ApiError.js";
import { logger } from "../config/logger.js";

// Source-of-truth reconciliation for payments — the client-driven
// `/checkout/verify` can be missed entirely (tab closed, network drop
// after payment but before the verify call lands), so Razorpay's own
// server-to-server webhook is what actually guarantees an order never
// gets stuck in "pending" after a real successful payment.
export async function razorpayWebhook(req: Request, res: Response) {
  const signature = req.headers["x-razorpay-signature"] as string | undefined;
  if (!signature || !req.rawBody) {
    throw ApiError.badRequest("Missing signature or body");
  }

  if (!verifyWebhookSignature(req.rawBody, signature)) {
    throw ApiError.unauthorized("Invalid webhook signature");
  }

  const event = req.body as {
    event: string;
    payload?: { payment?: { entity?: { order_id?: string; id?: string; amount?: number } } };
  };

  const orderId = event.payload?.payment?.entity?.order_id;
  const paymentId = event.payload?.payment?.entity?.id;

  if (!orderId) {
    // Not a payment event we care about — acknowledge so Razorpay stops retrying.
    res.status(200).json({ received: true });
    return;
  }

  const order = await Order.findOne({ razorpayOrderId: orderId });
  if (!order) {
    logger.warn({ orderId, event: event.event }, "Webhook for unknown order");
    res.status(200).json({ received: true });
    return;
  }

  await Payment.create({
    order: order._id,
    providerOrderId: orderId,
    providerPaymentId: paymentId,
    event: `webhook.${event.event}`,
    status: event.event,
    rawPayload: event,
  });

  // Idempotent — re-delivery of an already-applied event is a no-op.
  if (event.event === "payment.captured" && order.status === "pending") {
    order.status = "paid";
    order.paymentStatus = "captured";
    order.razorpayPaymentId = paymentId;
    order.paidAt = new Date();
    order.statusHistory.push({ status: "paid", note: "Confirmed via Razorpay webhook" });
    await order.save();
    // Note: intentionally not touching the guest cart here — a webhook
    // payload has no reliable link back to a cart session cookie. The
    // client-side verify path (checkoutController.verifyPayment) clears
    // the cart in the common case; if only the webhook fires (tab closed
    // before verify), the cart just expires normally via its TTL index.
  } else if (event.event === "payment.failed" && order.status === "pending") {
    order.paymentStatus = "failed";
    order.statusHistory.push({ status: "pending", note: "Payment failed (webhook)" });
    await order.save();
  }

  res.status(200).json({ received: true });
}
