import type { Request, Response } from "express";
import { Category } from "../models/Category.js";
import { ApiError } from "../utils/ApiError.js";
import { recordAudit } from "../utils/audit.js";

export async function listCategories(_req: Request, res: Response) {
  const categories = await Category.find({ status: "published" }).sort({ createdAt: 1 });
  res.json(categories);
}

export async function listCategoriesAdmin(_req: Request, res: Response) {
  const categories = await Category.find().sort({ createdAt: 1 });
  res.json(categories);
}

export async function getCategoryBySlug(req: Request, res: Response) {
  const category = await Category.findOne({ slug: req.params.slug, status: "published" });
  if (!category) throw ApiError.notFound("Category not found");
  res.json(category);
}

export async function createCategory(req: Request, res: Response) {
  const category = await Category.create(req.body);
  await recordAudit(req, "category.create", "Category", String(category._id), req.body);
  res.status(201).json(category);
}

export async function updateCategory(req: Request, res: Response) {
  const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!category) throw ApiError.notFound("Category not found");
  await recordAudit(req, "category.update", "Category", String(category._id), req.body);
  res.json(category);
}

export async function deleteCategory(req: Request, res: Response) {
  const { Product } = await import("../models/Product.js");
  const productCount = await Product.countDocuments({ category: req.params.id });
  if (productCount > 0) {
    throw ApiError.conflict("Cannot delete a category that still has products. Delete or reassign them first.");
  }

  const category = await Category.findByIdAndDelete(req.params.id);
  if (!category) throw ApiError.notFound("Category not found");
  await recordAudit(req, "category.delete", "Category", req.params.id!);
  res.status(204).send();
}
