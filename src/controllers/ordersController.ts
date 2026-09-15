import type { Request, Response } from "express";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { InventoryLog } from "../models/InventoryLog.js";
import { ApiError } from "../utils/ApiError.js";
import { buildPagination, paginatedResponse } from "../utils/pagination.js";
import { recordAudit } from "../utils/audit.js";
import { razorpay } from "../utils/razorpay.js";
import { logger } from "../config/logger.js";

export async function listOrdersAdmin(req: Request, res: Response) {
  const query = req.validatedQuery as { page?: number; limit?: number; status?: string; search?: string };
  const pagination = buildPagination(query);

  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;
  if (query.search) {
    filter.$or = [
      { orderNumber: { $regex: escapeRegex(query.search), $options: "i" } },
      { customerName: { $regex: escapeRegex(query.search), $options: "i" } },
      { customerEmail: { $regex: escapeRegex(query.search), $options: "i" } },
    ];
  }

  const [items, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(pagination.skip).limit(pagination.limit),
    Order.countDocuments(filter),
  ]);

  res.json(paginatedResponse(items, total, pagination));
}

function escapeRegex(input: string): string {
  return input.slice(0, 120).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function getOrderAdmin(req: Request, res: Response) {
  const order = await Order.findById(req.params.id);
  if (!order) throw ApiError.notFound("Order not found");
  res.json(order);
}

export async function updateOrderStatus(req: Request, res: Response) {
  const { status, note } = req.body as { status: string; note?: string };

  const order = await Order.findById(req.params.id);
  if (!order) throw ApiError.notFound("Order not found");

  const previousStatus = order.status;

  // Cancelling/refunding a still-reserved order restocks the items.
  if ((status === "cancelled" || status === "refunded") && previousStatus !== "cancelled" && previousStatus !== "refunded") {
    for (const item of order.items) {
      const product = await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.qty } }, { new: true });
      if (product) {
        await InventoryLog.create({
          product: product._id,
          change: item.qty,
          balanceAfter: product.stock,
          reason: "cancellation",
          order: order._id,
          actor: req.user?.sub,
          note: `Order ${order.orderNumber} ${status}`,
        });
      }
    }
    if (status === "refunded") order.paymentStatus = "refunded";
  }

  order.status = status as typeof order.status;
  order.statusHistory.push({ status, changedBy: req.user?.sub as never, note });
  await order.save();

  await recordAudit(req, "order.status_update", "Order", String(order._id), { from: previousStatus, to: status });
  res.json(order);
}

export async function deleteOrder(req: Request, res: Response) {
  const order = await Order.findByIdAndDelete(req.params.id);
  if (!order) throw ApiError.notFound("Order not found");
  await recordAudit(req, "order.delete", "Order", req.params.id!);
  res.status(204).send();
}

// Fallback reconciliation an admin can trigger manually if an order looks
// stuck — re-polls Razorpay directly rather than waiting on the webhook.
export async function refreshOrderPayment(req: Request, res: Response) {
  const order = await Order.findById(req.params.id);
  if (!order) throw ApiError.notFound("Order not found");
  if (!order.razorpayOrderId) throw ApiError.badRequest("Order has no linked Razorpay order");

  try {
    const rzpOrder = await razorpay.orders.fetch(order.razorpayOrderId);
    const payments = await razorpay.orders.fetchPayments(order.razorpayOrderId);
    const captured = payments.items.find((p) => p.status === "captured");

    if (captured && order.status === "pending") {
      order.status = "paid";
      order.paymentStatus = "captured";
      order.razorpayPaymentId = captured.id;
      order.paidAt = new Date();
      order.statusHistory.push({ status: "paid", note: "Reconciled via admin refresh" });
      await order.save();
    }

    res.json({ razorpayStatus: rzpOrder.status, order });
  } catch (err) {
    logger.error({ err, orderId: order._id }, "Failed to refresh payment from Razorpay");
    throw ApiError.badRequest("Could not reach Razorpay to refresh payment status");
  }
}
