import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import { authenticate } from "./lib/auth.js";
import { logger } from "./lib/logger.js";
import { requestLogger } from "./lib/request-logger.js";

import authRoutes from "./routes/auth.js";
import productRoutes from "./routes/products.js";
import contentRoutes from "./routes/content.js";
import orderRoutes from "./routes/orders.js";
import userRoutes from "./routes/users.js";
import cartRoutes from "./routes/cart.js";
import favoriteRoutes from "./routes/favorites.js";
import reviewRoutes from "./routes/reviews.js";
import posRoutes from "./routes/pos.js";
import inventoryRoutes from "./routes/inventory.js";
import deliveryRoutes from "./routes/delivery.js";
import notificationRoutes from "./routes/notifications.js";
import contactRoutes from "./routes/contact.js";
import uploadRoutes from "./routes/upload.js";
import fiscalRoutes from "./routes/fiscal.js";
import promotionRoutes from "./routes/promotions.js";
import cancellationRoutes from "./routes/cancellations.js";
import emailTemplateRoutes from "./routes/email-templates.js";
import storeRoutes from "./routes/stores.js";

const app = express();
const PORT = parseInt(process.env.PORT || "4000");

// --- Security Middleware ---

// Helmet: security headers (X-Frame-Options, CSP, HSTS, X-Content-Type-Options, etc.)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS: require explicit origins with robust matching (protocol & trailing-slash agnostic)
const allowedOrigins = process.env.CORS_ORIGIN?.split(",").map(o => o.trim()).filter(Boolean) || [];
const normalizedAllowed = allowedOrigins.map(o => 
  o.toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "")
);

if (allowedOrigins.length === 0) {
  logger.warn("CORS_ORIGIN is not set. Cross-origin requests will be blocked.");
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }
    const normalizedOrigin = origin.toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
    const isAllowed = normalizedOrigin === "localhost" || 
                      normalizedOrigin.startsWith("localhost:") ||
                      normalizedOrigin === "127.0.0.1" ||
                      normalizedAllowed.includes(normalizedOrigin);
    if (isAllowed) {
      callback(null, true);
    } else {
      logger.warn({ origin, allowedOrigins }, "CORS blocked request due to origin mismatch");
      callback(null, false);
    }
  },
  credentials: true,
}));

// Global rate limit: 100 requests per minute per IP
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiadas peticiones. Intenta de nuevo en un momento." },
});
app.use(globalLimiter);

// Strict rate limit for auth endpoints: 10 requests per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiados intentos. Espera 15 minutos antes de intentar de nuevo." },
});

app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());
app.use(requestLogger); // Structured HTTP request logging
app.use(authenticate); // Attach user to req if token present

// --- Routes ---
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/content", contentRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/users", userRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/pos", posRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/delivery", deliveryRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/fiscal", fiscalRoutes);
app.use("/api/promotions", promotionRoutes);
app.use("/api/cancellations", cancellationRoutes);
app.use("/api/email-templates", emailTemplateRoutes);
app.use("/api/stores", storeRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// --- Global Error Handler ---
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  logger.error({
    err,
    method: req.method,
    path: req.originalUrl,
    userId: (req as any).user?.userId,
  }, "Unhandled error");
  // Never expose stack traces or internal details to the client
  res.status(500).json({ error: "Error interno del servidor" });
});

// --- Graceful Shutdown ---
const server = app.listen(PORT, "0.0.0.0", () => {
  logger.info({ port: PORT }, "🛹 Skating Store API running");
});

function gracefulShutdown(signal: string) {
  logger.info({ signal }, "Received shutdown signal, closing gracefully...");
  server.close(() => {
    logger.info("HTTP server closed");
    // Close DB pool
    import("./db/pool.js").then(({ pool }) => {
      pool.end().then(() => {
        logger.info("Database pool closed");
        process.exit(0);
      });
    });
  });
  // Force exit after 10 seconds
  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10_000);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
