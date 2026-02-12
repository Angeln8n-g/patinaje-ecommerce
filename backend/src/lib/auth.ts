import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

const JWT_SECRET = process.env.JWT_SECRET || "change-me";
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

// Express middleware: attaches req.user if valid token
export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    try {
      const payload = verifyToken(header.slice(7));
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
