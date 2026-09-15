import type { Request, Response } from "express";
import mongoose, { type HydratedDocument } from "mongoose";
import { randomUUID } from "node:crypto";
import { Cart } from "../models/Cart.js";
import { Product } from "../models/Product.js";
import { Order, type OrderDoc } from "../models/Order.js";
import { Payment } from "../models/Payment.js";
import { InventoryLog } from "../models/InventoryLog.js";
import { User } from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";
import { generateOrderNumber } from "../utils/orderNumber.js";
import { razorpay, verifyPaymentSignature } from "../utils/razorpay.js";

type ShippingAddress = {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
};

async function releaseStockAndCancel(order: HydratedDocument<OrderDoc>, note: string): Promise<void> {
  for (const item of order.items) {
    const product = await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.qty } }, { new: true });
    if (product) {
      await InventoryLog.create({
        product: product._id,
        change: item.qty,
        balanceAfter: product.stock,
        reason: "cancellation",
        order: order._id,
        note,
      });
    }
  }
  order.status = "cancelled";
  order.statusHistory.push({ status: "cancelled", note });
  await order.save();
}

// Creates a Pending order, atomically reserving stock for every line item
// inside a transaction (all-or-nothing — a mid-checkout stock race on one
// item rolls the whole reservation back rather than leaving partial state),
// then opens a matching Razorpay order for the client to pay against.
export async function createCheckoutSession(req: Request, res: Response) {
  const { customerName, customerEmail, shippingAddress } = req.body as {
    customerName: string;
    customerEmail: string;
    shippingAddress: ShippingAddress;
  };

  const cart = await Cart.findOne({ sessionId: req.cartSessionId! });
  if (!cart || cart.items.length === 0) throw ApiError.badRequest("Cart is empty");

  const session = await mongoose.startSession();
  let order: HydratedDocument<OrderDoc> | undefined;

  try {
    await session.withTransaction(async () => {
      const orderItems = [];
      let total = 0;

      for (const item of cart.items) {
        const product = await Product.findOneAndUpdate(
          { _id: item.product, stock: { $gte: item.qty } },
          { $inc: { stock: -item.qty } },
          { new: true, session },
        ).populate("category", "title");

        if (!product) {
          const current = await Product.findById(item.product).session(session);
          throw ApiError.conflict(
            `"${item.name}" only has ${current?.stock ?? 0} left in stock`,
          );
        }

        const lineTotal = item.price * item.qty;
        total += lineTotal;
        orderItems.push({
          product: product._id,
          name: product.name,
          category: (product.category as unknown as { title: string })?.title ?? "",
          price: item.price,
          qty: item.qty,
          lineTotal,
        });

        await InventoryLog.create(
          [
            {
              product: product._id,
              change: -item.qty,
              balanceAfter: product.stock,
              reason: "order",
              note: "Reserved at checkout",
            },
          ],
          { session },
        );
      }

      let orderNumber = generateOrderNumber();
      for (let attempt = 0; attempt < 3; attempt++) {
        const exists = await Order.exists({ orderNumber }).session(session);
        if (!exists) break;
        orderNumber = generateOrderNumber();
      }

      // Auto-create/update a customer record for CRM — no login required to buy.
      const existingUser = await User.findOne({ email: customerEmail.toLowerCase() }).session(session);
      let customerId = existingUser?._id;
      if (!existingUser) {
        const { hashPassword } = await import("../utils/password.js");
        const created = await User.create(
          [
            {
              name: customerName,
              email: customerEmail.toLowerCase(),
              passwordHash: await hashPassword(randomUUID()),
              role: "customer",
              tier: "Trial",
              addresses: [{ ...shippingAddress, isDefault: true }],
            },
          ],
          { session },
        );
        customerId = created[0]!._id;
      }

      const created = await Order.create(
        [
          {
            orderNumber,
            customer: customerId,
            customerName,
            customerEmail: customerEmail.toLowerCase(),
            shippingAddress,
            items: orderItems,
            itemCount: orderItems.reduce((n, i) => n + i.qty, 0),
            total,
            status: "pending",
            statusHistory: [{ status: "pending", note: "Order created, awaiting payment" }],
            paymentStatus: "created",
          },
        ],
        { session },
      );
      order = created[0]!;
    });
  } finally {
    await session.endSession();
  }

  if (!order) throw ApiError.badRequest("Failed to create order");

  // The stock reservation above is already committed. If the Razorpay call
  // fails, that reservation must be released and the order cancelled —
  // otherwise a gateway outage would permanently strand stock behind an
  // order the customer has no way to ever pay for.
  let razorpayOrder;
  try {
    razorpayOrder = await razorpay.orders.create({
      amount: Math.round(order.total * 100),
      currency: "INR",
      receipt: order.orderNumber,
      notes: { orderId: String(order._id) },
    });
  } catch (err) {
    await releaseStockAndCancel(order, "Razorpay order creation failed");
    await Payment.create({
      order: order._id,
      event: "order.create_failed",
      status: "failed",
      amount: order.total,
      rawPayload: err instanceof Error ? { message: err.message } : err,
    });
    throw new ApiError(502, "Payment gateway is unavailable right now. Please try again shortly.");
  }

  order.razorpayOrderId = razorpayOrder.id;
  await order.save();

  await Payment.create({
    order: order._id,
    providerOrderId: razorpayOrder.id,
    event: "order.created",
    status: "created",
    amount: order.total,
    rawPayload: razorpayOrder,
  });

  res.status(201).json({
    orderId: order._id,
    orderNumber: order.orderNumber,
    razorpayOrderId: razorpayOrder.id,
    amount: razorpayOrder.amount,
    currency: razorpayOrder.currency,
    keyId: process.env.RAZORPAY_KEY_ID,
  });
}

export async function verifyPayment(req: Request, res: Response) {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body as {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  };

  const order = await Order.findOne({ razorpayOrderId: razorpay_order_id });
  if (!order) throw ApiError.notFound("Order not found");

  const valid = verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);

  await Payment.create({
    order: order._id,
    providerOrderId: razorpay_order_id,
    providerPaymentId: razorpay_payment_id,
    event: "payment.verify",
    status: valid ? "captured" : "signature_mismatch",
    rawPayload: req.body,
  });

  if (!valid) {
    throw ApiError.badRequest("Payment signature verification failed");
  }

  if (order.status === "pending") {
    order.status = "paid";
    order.paymentStatus = "captured";
    order.razorpayPaymentId = razorpay_payment_id;
    order.razorpaySignature = razorpay_signature;
    order.paidAt = new Date();
    order.statusHistory.push({ status: "paid", note: "Verified client-side after checkout" });
    await order.save();

    await Cart.deleteOne({ sessionId: req.cartSessionId! });
  }

  res.json({ orderId: order._id, orderNumber: order.orderNumber, status: order.status });
}
