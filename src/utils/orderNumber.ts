import { randomInt } from "node:crypto";

// Human-friendly, sortable order numbers: CEL-260915-4821
export function generateOrderNumber(): string {
  const now = new Date();
  const y = String(now.getUTCFullYear()).slice(2);
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  const suffix = randomInt(1000, 9999);
  return `CEL-${y}${m}${d}-${suffix}`;
}

export function generateSku(prefix: string): string {
  const suffix = randomInt(1000, 9999);
  return `${prefix.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8)}-${suffix}`;
}
