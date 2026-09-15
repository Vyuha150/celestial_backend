import type { Request } from "express";
import { AuditLog } from "../models/AuditLog.js";

export async function recordAudit(
  req: Request,
  action: string,
  entityType: string,
  entityId: string,
  diff?: unknown,
): Promise<void> {
  if (!req.user) return;
  await AuditLog.create({
    actor: req.user.sub,
    action,
    entityType,
    entityId,
    diff,
    ip: req.ip,
  });
}
