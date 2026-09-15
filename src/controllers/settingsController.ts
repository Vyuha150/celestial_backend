import type { Request, Response } from "express";
import { Setting } from "../models/Setting.js";
import { recordAudit } from "../utils/audit.js";

async function getOrCreateSettings() {
  let settings = await Setting.findOne({ key: "store" });
  if (!settings) settings = await Setting.create({ key: "store" });
  return settings;
}

export async function getSettings(_req: Request, res: Response) {
  res.json(await getOrCreateSettings());
}

export async function updateSettings(req: Request, res: Response) {
  const settings = await getOrCreateSettings();

  const body = req.body as Partial<{
    storeName: string;
    currency: string;
    supportEmail: string;
    timezone: string;
    features: Partial<{
      maintenance: boolean;
      abandonedCart: boolean;
      referrals: boolean;
      transactionalEmails: boolean;
    }>;
  }>;

  if (body.storeName !== undefined) settings.storeName = body.storeName;
  if (body.currency !== undefined) settings.currency = body.currency;
  if (body.supportEmail !== undefined) settings.supportEmail = body.supportEmail;
  if (body.timezone !== undefined) settings.timezone = body.timezone;

  const features = body.features;
  if (features && settings.features) {
    if (features.maintenance !== undefined) settings.features.maintenance = features.maintenance;
    if (features.abandonedCart !== undefined) settings.features.abandonedCart = features.abandonedCart;
    if (features.referrals !== undefined) settings.features.referrals = features.referrals;
    if (features.transactionalEmails !== undefined) settings.features.transactionalEmails = features.transactionalEmails;
  }

  await settings.save();
  await recordAudit(req, "settings.update", "Setting", String(settings._id), body);
  res.json(settings);
}
