import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { pinoHttp } from "pino-http";
import path from "node:path";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { generalLimiter } from "./middlewares/rateLimit.js";
import { cartSession } from "./middlewares/cartSession.js";
import { notFoundHandler, errorHandler } from "./middlewares/error.js";

import { authRouter } from "./routes/auth.js";
import { categoriesRouter } from "./routes/categories.js";
import { productsRouter } from "./routes/products.js";
import { cartRouter } from "./routes/cart.js";
import { checkoutRouter } from "./routes/checkout.js";
import { webhooksRouter } from "./routes/webhooks.js";
import { contentRouter } from "./routes/content.js";
import { trackingRouter } from "./routes/tracking.js";
import { adminRouter } from "./routes/admin/index.js";

export const app = express();

app.set("trust proxy", 1); // behind Nginx on the VPS
app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGINS,
    credentials: true,
  }),
);
app.use(pinoHttp({ logger }));
app.use(generalLimiter);

// Webhook route needs the raw request body for HMAC signature
// verification — mounted BEFORE the global JSON parser, which would
// otherwise consume and reshape the body before we can hash it.
app.use(
  "/webhooks",
  express.raw({ type: "application/json" }),
  (req, _res, next) => {
    req.rawBody = req.body?.toString("utf8") ?? "";
    try {
      req.body = req.rawBody ? JSON.parse(req.rawBody) : {};
    } catch {
      req.body = {};
    }
    next();
  },
  webhooksRouter,
);

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use("/uploads", express.static(path.resolve(env.UPLOAD_DIR)));

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/auth", authRouter);
app.use("/categories", categoriesRouter);
app.use("/products", productsRouter);
app.use("/cart", cartSession, cartRouter);
app.use("/checkout", cartSession, checkoutRouter);
app.use("/content", contentRouter);
app.use("/track", cartSession, trackingRouter);
app.use("/admin", adminRouter);

app.use(notFoundHandler);
app.use(errorHandler);
