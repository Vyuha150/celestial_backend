import type { Request, Response } from "express";
import { Types } from "mongoose";
import { Product } from "../models/Product.js";
import { Order } from "../models/Order.js";
import { InventoryLog } from "../models/InventoryLog.js";
import { ApiError } from "../utils/ApiError.js";
import { buildPagination, paginatedResponse } from "../utils/pagination.js";
import { generateSku } from "../utils/orderNumber.js";
import { recordAudit } from "../utils/audit.js";

const SUCCESSFUL_STATUSES = ["paid", "shipped", "delivered"];

// Computed on read from real order line items — never stored on the
// Product doc, so it can't drift out of sync with actual sales.
async function sales30dByProduct(productIds: Types.ObjectId[]): Promise<Map<string, number>> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const rows = await Order.aggregate([
    { $match: { createdAt: { $gte: since }, status: { $in: SUCCESSFUL_STATUSES } } },
    { $unwind: "$items" },
    { $match: { "items.product": { $in: productIds } } },
    { $group: { _id: "$items.product", qty: { $sum: "$items.qty" } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), r.qty as number]));
}

export async function listProductsPublic(req: Request, res: Response) {
  const { category } = req.query as { category?: string };
  const filter: Record<string, unknown> = { status: "live" };

  if (category) {
    const { Category } = await import("../models/Category.js");
    const cat = await Category.findOne({ slug: category });
    if (!cat) return res.json([]);
    filter.category = cat._id;
  }

  const products = await Product.find(filter).sort({ createdAt: 1 });
  res.json(products);
}

export async function listProductsAdmin(req: Request, res: Response) {
  const query = req.validatedQuery as {
    page?: number;
    limit?: number;
    category?: string;
    status?: string;
    search?: string;
  };
  const pagination = buildPagination(query);

  const filter: Record<string, unknown> = {};
  if (query.category) filter.category = query.category;
  if (query.status) filter.status = query.status;
  if (query.search) filter.$text = { $search: query.search };

  const [items, total] = await Promise.all([
    Product.find(filter)
      .populate("category", "title slug")
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit),
    Product.countDocuments(filter),
  ]);

  const salesMap = await sales30dByProduct(items.map((p) => p._id));
  const withSales = items.map((p) => ({ ...p.toObject(), sales30d: salesMap.get(String(p._id)) ?? 0 }));

  res.json(paginatedResponse(withSales, total, pagination));
}

export async function getProduct(req: Request, res: Response) {
  const product = await Product.findById(req.params.id).populate("category", "title slug");
  if (!product) throw ApiError.notFound("Product not found");
  res.json(product);
}

export async function createProduct(req: Request, res: Response) {
  const body = { ...req.body, sku: req.body.sku || generateSku(req.body.name) };
  const product = await Product.create(body);

  if (product.stock > 0) {
    await InventoryLog.create({
      product: product._id,
      change: product.stock,
      balanceAfter: product.stock,
      reason: "restock",
      actor: req.user?.sub,
      note: "Initial stock on product creation",
    });
  }

  await recordAudit(req, "product.create", "Product", String(product._id), body);
  res.status(201).json(product);
}

export async function updateProduct(req: Request, res: Response) {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!product) throw ApiError.notFound("Product not found");
  await recordAudit(req, "product.update", "Product", String(product._id), req.body);
  res.json(product);
}

export async function deleteProduct(req: Request, res: Response) {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) throw ApiError.notFound("Product not found");
  await recordAudit(req, "product.delete", "Product", req.params.id!);
  res.status(204).send();
}

// Explicit stock movement (restock / manual adjustment) — separate from
// the atomic order-time decrement in checkoutController, and always
// logged to InventoryLog for the operations-tracking trail.
export async function adjustStock(req: Request, res: Response) {
  const { change, reason, note } = req.body as { change: number; reason: "restock" | "adjustment"; note?: string };

  const product = await Product.findById(req.params.id);
  if (!product) throw ApiError.notFound("Product not found");

  const newStock = product.stock + change;
  if (newStock < 0) throw ApiError.badRequest("Adjustment would result in negative stock");

  product.stock = newStock;
  await product.save();

  await InventoryLog.create({
    product: product._id,
    change,
    balanceAfter: newStock,
    reason,
    actor: req.user?.sub,
    note,
  });

  await recordAudit(req, "product.stock_adjust", "Product", String(product._id), { change, reason, note });
  res.json(product);
}

export async function uploadProductImages(req: Request, res: Response) {
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  if (files.length === 0) throw ApiError.badRequest("No files uploaded");

  const product = await Product.findById(req.params.id);
  if (!product) throw ApiError.notFound("Product not found");

  const urls = files.map((f) => `/uploads/products/${f.filename}`);
  product.images.push(...urls);
  await product.save();

  await recordAudit(req, "product.images_add", "Product", String(product._id), { urls });
  res.status(201).json(product);
}
