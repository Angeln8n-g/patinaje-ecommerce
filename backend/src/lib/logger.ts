/**
 * Structured logger using Pino.
 * Replaces all console.log/error calls with structured, queryable JSON logs.
 *
 * Usage:
 *   import { logger } from "../lib/logger.js";
 *   logger.info({ orderId, userId }, "Order created");
 *   logger.error({ err, endpoint }, "Request failed");
 *   logger.warn({ ip, email }, "Rate limit exceeded");
 *
 * Security audit events use logger.security():
 *   logger.security("login_failed", { email, ip });
 *   logger.security("access_denied", { userId, endpoint });
 */
import pino from "pino";

const IS_PRODUCTION = process.env.NODE_ENV === "production";

const baseLogger = pino({
  level: process.env.LOG_LEVEL || (IS_PRODUCTION ? "info" : "debug"),
  transport: IS_PRODUCTION
    ? undefined
    : { target: "pino-pretty", options: { colorize: true, translateTime: "SYS:HH:MM:ss" } },
  formatters: {
    level(label) {
      return { level: label };
    },
  },
  // Redact sensitive fields from logs
  redact: {
    paths: [
      "password",
      "password_hash",
      "current_password",
      "token",
      "authorization",
      "cookie",
      "req.headers.authorization",
      "req.headers.cookie",
    ],
    censor: "[REDACTED]",
  },
});

// Extend with a security audit helper
export const logger = Object.assign(baseLogger, {
  /**
   * Log a security-relevant event (login attempts, access denials, role changes, etc.)
   * These events should be monitored and alerted on in production.
   */
  security(event: string, data: Record<string, unknown> = {}) {
    baseLogger.info({ security: true, event, ...data }, `[SECURITY] ${event}`);
  },
});
