import type { Request, Response } from "express";
import { Page } from "../models/Page.js";
import { Section } from "../models/Section.js";
import { ApiError } from "../utils/ApiError.js";
import { recordAudit } from "../utils/audit.js";

export async function listPublishedPages(_req: Request, res: Response) {
  res.json(await Page.find({ status: "published" }).sort({ createdAt: 1 }));
}

export async function listPublishedSections(req: Request, res: Response) {
  const { pageSlug } = req.query as { pageSlug?: string };
  const filter = pageSlug ? { pageSlug } : {};
  res.json(await Section.find(filter).sort({ key: 1 }));
}

export async function listPagesAdmin(_req: Request, res: Response) {
  res.json(await Page.find().sort({ createdAt: -1 }));
}

export async function createPage(req: Request, res: Response) {
  const page = await Page.create(req.body);
  await recordAudit(req, "page.create", "Page", String(page._id), req.body);
  res.status(201).json(page);
}

export async function updatePage(req: Request, res: Response) {
  const page = await Page.findOneAndUpdate({ slug: req.params.slug }, req.body, { new: true, runValidators: true });
  if (!page) throw ApiError.notFound("Page not found");
  await recordAudit(req, "page.update", "Page", String(page._id), req.body);
  res.json(page);
}

export async function deletePage(req: Request, res: Response) {
  const page = await Page.findOneAndDelete({ slug: req.params.slug });
  if (!page) throw ApiError.notFound("Page not found");
  await Section.deleteMany({ pageSlug: req.params.slug });
  await recordAudit(req, "page.delete", "Page", String(page._id));
  res.status(204).send();
}

export async function listSectionsAdmin(_req: Request, res: Response) {
  res.json(await Section.find().sort({ pageSlug: 1, key: 1 }));
}

export async function upsertSection(req: Request, res: Response) {
  const { pageSlug, key } = req.body as { pageSlug: string; key: string };
  const section = await Section.findOneAndUpdate({ pageSlug, key }, req.body, {
    new: true,
    upsert: true,
    runValidators: true,
  });
  await recordAudit(req, "section.upsert", "Section", String(section._id), req.body);
  res.status(201).json(section);
}

export async function deleteSection(req: Request, res: Response) {
  const section = await Section.findByIdAndDelete(req.params.id);
  if (!section) throw ApiError.notFound("Section not found");
  await recordAudit(req, "section.delete", "Section", req.params.id!);
  res.status(204).send();
}
