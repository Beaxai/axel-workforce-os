import type { Request, Response, NextFunction, RequestHandler } from "express";
import { SESSION_COOKIE, getSessionUser, type AuthUser, type PartyRole } from "../lib/auth";
import { isTrustedCorrespondenceStaff } from "../lib/correspondence-policy";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

function readToken(req: Request): string | undefined {
  const fromCookie = (req as Request & { cookies?: Record<string, string> }).cookies?.[SESSION_COOKIE];
  if (fromCookie) return fromCookie;
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7);
  return undefined;
}

/** Populates req.user when a valid session exists; never blocks. */
export const attachUser: RequestHandler = async (req, _res, next) => {
  try {
    const user = await getSessionUser(readToken(req));
    if (user) req.user = user;
  } catch {
    /* ignore — treated as unauthenticated */
  }
  next();
};

/** Requires a valid session. Returns 401 otherwise. */
export const requireAuth: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      req.user = (await getSessionUser(readToken(req))) ?? undefined;
    }
  } catch {
    /* ignore */
  }
  if (!req.user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  next();
};

/** Requires the authenticated user to hold one of the given roles. With no
 * roles supplied, any authenticated user passes. */
export function requireRoles(...roles: PartyRole[]): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    if (roles.length > 0 && !roles.includes(req.user.role)) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }
    next();
  };
}

/** For routes that expose market contacts/routing identities. Role labels alone
 * are insufficient because an external organization can legitimately have an
 * ADMIN or CSA role. */
export const requireTrustedAxelCorrespondenceStaff: RequestHandler = async (req, res, next) => {
  if (!(await isTrustedCorrespondenceStaff(req.user))) {
    res.status(403).json({ error: "Trusted active Axel ADMIN or CSA membership required" });
    return;
  }
  next();
};

/** Trust-anchor and membership administration may only be initiated by an
 * already trusted Axel ADMIN. The trusted-org table itself has no HTTP CRUD. */
export const requireTrustedAxelAdmin: RequestHandler = async (req, res, next) => {
  if (req.user?.role !== "ADMIN" || !(await isTrustedCorrespondenceStaff(req.user))) {
    res.status(403).json({ error: "Trusted active Axel ADMIN membership required" });
    return;
  }
  next();
};
