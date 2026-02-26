import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { queryOne } from "../db";

const JWT_SECRET = process.env.JWT_SECRET || "change-me";

export interface AuthPayload {
  userId: string;
  email: string;
}

/** Extend Express Request to include the authenticated user */
declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

/** Sign a JWT token (expires in 24h) */
export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });
}

/** Middleware: require a valid JWT */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Token manquant" });
    return;
  }

  try {
    const token = header.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Token invalide ou expiré" });
  }
}

/** Middleware: require admin role (must be used AFTER requireAuth) */
export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "Non authentifié" });
    return;
  }

  const role = await queryOne<{ role: string }>(
    `SELECT role FROM user_roles WHERE user_id = $1 AND role IN ('admin', 'superadmin')`,
    [req.user.userId]
  );

  if (!role) {
    res.status(403).json({ error: "Accès interdit — rôle admin requis" });
    return;
  }

  next();
}

/** Middleware: require superadmin role (must be used AFTER requireAuth) */
export async function requireSuperAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "Non authentifié" });
    return;
  }

  const role = await queryOne<{ role: string }>(
    `SELECT role FROM user_roles WHERE user_id = $1 AND role = 'superadmin'`,
    [req.user.userId]
  );

  if (!role) {
    res.status(403).json({ error: "Accès interdit — rôle superadmin requis" });
    return;
  }

  next();
}
