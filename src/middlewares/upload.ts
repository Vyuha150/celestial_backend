import multer from "multer";
import path from "node:path";
import { mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { env } from "../config/env.js";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

// Don't rely on the directory existing from git/deploy (an empty dir can't
// be tracked by git at all without a placeholder file, and that placeholder
// silently failed to make it into a deploy once already) — create it at
// boot so this can't happen again regardless of how the app got deployed.
const PRODUCTS_UPLOAD_DIR = path.join(env.UPLOAD_DIR, "products");
mkdirSync(PRODUCTS_UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, PRODUCTS_UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${randomUUID()}${ext}`);
  },
});

export const uploadProductImage = multer({
  storage,
  limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      cb(new Error("Only JPEG, PNG, WebP, or GIF images are allowed"));
      return;
    }
    cb(null, true);
  },
});
