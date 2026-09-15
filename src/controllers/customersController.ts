import type { Request, Response } from "express";
import { User } from "../models/User.js";
import { Order } from "../models/Order.js";
import { ApiError } from "../utils/ApiError.js";
import { buildPagination, paginatedResponse } from "../utils/pagination.js";
import { recordAudit } from "../utils/audit.js";

const PAID_STATUSES = ["paid", "shipped", "delivered"];

export async function listCustomersAdmin(req: Request, res: Response) {
  const query = req.validatedQuery as { page?: number; limit?: number; search?: string; tier?: string };
  const pagination = buildPagination(query);

  const match: Record<string, unknown> = { role: "customer" };
  if (query.tier) match.tier = query.tier;
  if (query.search) {
    const safe = query.search.slice(0, 120).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    match.$or = [{ name: { $regex: safe, $options: "i" } }, { email: { $regex: safe, $options: "i" } }];
  }

  const [rows, total] = await Promise.all([
    User.aggregate([
      { $match: match },
      { $sort: { createdAt: -1 } },
      { $skip: pagination.skip },
      { $limit: pagination.limit },
      {
        $lookup: {
          from: "orders",
          let: { userId: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$customer", "$$userId"] }, status: { $in: PAID_STATUSES } } },
            { $group: { _id: null, orders: { $sum: 1 }, lifetime: { $sum: "$total" } } },
          ],
          as: "orderStats",
        },
      },
      {
        $project: {
          name: 1,
          email: 1,
          tier: 1,
          createdAt: 1,
          orders: { $ifNull: [{ $arrayElemAt: ["$orderStats.orders", 0] }, 0] },
          lifetime: { $ifNull: [{ $arrayElemAt: ["$orderStats.lifetime", 0] }, 0] },
        },
      },
    ]),
    User.countDocuments(match),
  ]);

  res.json(paginatedResponse(rows, total, pagination));
}

export async function getCustomerAdmin(req: Request, res: Response) {
  const customer = await User.findById(req.params.id).select("-passwordHash");
  if (!customer) throw ApiError.notFound("Customer not found");

  const orders = await Order.find({ customer: customer._id }).sort({ createdAt: -1 });
  res.json({ customer, orders });
}

export async function updateCustomerAdmin(req: Request, res: Response) {
  const customer = await User.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).select(
    "-passwordHash",
  );
  if (!customer) throw ApiError.notFound("Customer not found");
  await recordAudit(req, "customer.update", "User", String(customer._id), req.body);
  res.json(customer);
}

export async function deleteCustomerAdmin(req: Request, res: Response) {
  const { RefreshToken } = await import("../models/RefreshToken.js");
  const customer = await User.findByIdAndDelete(req.params.id);
  if (!customer) throw ApiError.notFound("Customer not found");
  await RefreshToken.deleteMany({ user: customer._id });
  await recordAudit(req, "customer.delete", "User", req.params.id!);
  res.status(204).send();
}
