import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { UserRole } from "@prisma/client";
import { env } from "../lib/env";

export interface AuthTokenPayload {
  userId: string;
  role: UserRole;
  locationId: string | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
    }
  }
}

const COOKIE_NAME = "token";

export function issueAuthCookie(res: Response, payload: AuthTokenPayload) {
  const token = jwt.sign(payload, env.jwtSecret, { expiresIn: "12h" });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProduction,
    maxAge: 12 * 60 * 60 * 1000,
  });
}

export function clearAuthCookie(res: Response) {
  res.clearCookie(COOKIE_NAME);
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  try {
    const payload = jwt.verify(token, env.jwtSecret) as AuthTokenPayload;
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired session" });
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}

export const HR_ROLES: UserRole[] = ["hr_central", "hr_deputy"];
export const LOCATION_ROLES: UserRole[] = ["location_manager", "location_deputy"];

/** True if the user may see data for the given location (HR sees all, location roles only their own). */
export function canAccessLocation(user: AuthTokenPayload, locationId: string): boolean {
  if (HR_ROLES.includes(user.role)) return true;
  return user.locationId === locationId;
}
