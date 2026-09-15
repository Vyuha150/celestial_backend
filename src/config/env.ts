import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),

  MONGO_URI: z.string().min(1, "MONGO_URI is required"),

  JWT_ACCESS_SECRET: z.string().min(20, "JWT_ACCESS_SECRET must be at least 20 chars"),
  JWT_REFRESH_SECRET: z.string().min(20, "JWT_REFRESH_SECRET must be at least 20 chars"),
  ACCESS_EXPIRES_IN: z.string().default("15m"),
  REFRESH_EXPIRES_IN: z.string().default("30d"),

  CORS_ORIGIN: z.string().min(1, "CORS_ORIGIN is required"),

  ADMIN_BOOTSTRAP_EMAIL: z.string().email(),
  ADMIN_BOOTSTRAP_PASSWORD: z.string().min(8),

  RAZORPAY_KEY_ID: z.string().min(1),
  RAZORPAY_KEY_SECRET: z.string().min(1),
  RAZORPAY_WEBHOOK_SECRET: z.string().min(1),

  UPLOAD_DIR: z.string().default("uploads"),
  MAX_UPLOAD_MB: z.coerce.number().positive().default(8),

  CART_TTL_HOURS: z.coerce.number().positive().default(72),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = {
  ...parsed.data,
  CORS_ORIGINS: parsed.data.CORS_ORIGIN.split(",").map((o) => o.trim()).filter(Boolean),
};
