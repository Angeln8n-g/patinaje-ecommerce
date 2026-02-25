import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

if (!process.env.JWT_SECRET) {
  throw new Error("FATAL: JWT_SECRET environment variable is not set. Server cannot start without it.");
}
const JWT_SECRET: string = process.env.JWT_SECRET;
const TOKEN_EXPIRY = "7d";

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

// Express middleware: attaches req.user if valid token (checks header first, then httpOnly cookie)
export function authenticate(req: Request, _res: Response, next: NextFunction) {
  let token: string | undefined;

  // Priority 1: Authorization header
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    token = header.slice(7);
  }

  // Priority 2: httpOnly cookie
  if (!token && req.cookies?.skating_token) {
    token = req.cookies.skating_token;
  }

  if (token) {
    try {
      const payload = verifyToken(token);
      (req as any).user = payload;
    } catch {
      // token invalid — user stays null
    }
  }
  next();
}

// Middleware: requires authenticated user
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!(req as any).user) {
    res.status(401).json({ error: "No autorizado" });
    return;
  }
  next();
}

// Middleware: requires specific role(s)
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as JwtPayload | undefined;
    if (!user || !roles.includes(user.role)) {
      res.status(403).json({ error: "Acceso denegado" });
      return;
    }
    next();
  };
}
