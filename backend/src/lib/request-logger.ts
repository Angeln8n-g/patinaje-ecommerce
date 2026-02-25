/**
 * Express middleware for structured HTTP request logging.
 * Logs method, path, status code, response time, and user ID (if authenticated).
 */
import { Request, Response, NextFunction } from "express";
import { logger } from "./logger.js";

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const userId = (req as any).user?.userId;

    const logData = {
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      duration,
      ip: req.ip || req.socket.remoteAddress,
      ...(userId && { userId }),
    };

    if (res.statusCode >= 500) {
      logger.error(logData, `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
    } else if (res.statusCode >= 400) {
      logger.warn(logData, `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
    } else {
      logger.info(logData, `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
    }
  });

  next();
}
