import type { Request, Response } from "express";
import { PageView } from "../models/PageView.js";
import { classifySource } from "../utils/traffic.js";

export async function trackPageView(req: Request, res: Response) {
  const { path, referrer, utmSource } = req.body as { path: string; referrer?: string; utmSource?: string };

  await PageView.create({
    sessionId: req.cartSessionId!,
    path,
    referrer,
    source: classifySource(referrer, utmSource),
  });

  res.status(204).send();
}
