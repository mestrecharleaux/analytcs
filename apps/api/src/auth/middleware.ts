import type { RequestHandler } from "express";
import { accessTokenFrom, resolveSession, verifyAccessToken } from "./service.js";
import type { AuthenticatedRequest } from "./types.js";

export const requireAuth: RequestHandler = async (req, res, next) => {
  try {
    const token = accessTokenFrom(req);
    if (!token) return res.status(401).json({ error: "Autenticação necessária." });
    const jwt = await verifyAccessToken(token);
    const session = await resolveSession(jwt.sessionToken);
    if (!session || session.userId !== jwt.userId) return res.status(401).json({ error: "Sessão inválida." });
    (req as AuthenticatedRequest).auth = { ...session, sessionToken: jwt.sessionToken };
    next();
  } catch {
    res.status(401).json({ error: "Token inválido ou expirado." });
  }
};

export function requirePermission(permission: string): RequestHandler {
  return (req, res, next) => {
    const values = (req as AuthenticatedRequest).auth.permissions;
    if (!values.includes("*") && !values.includes(permission)) {
      return res.status(403).json({ error: "Permissão insuficiente." });
    }
    next();
  };
}

export const requireApiPermission: RequestHandler = (req, res, next) => {
  const path = req.path;
  let permission: string | undefined;
  if (/\/sites\/[^/]+\/dashboard$/.test(path) || path.includes("/query-keys/")) permission = "analytics:view";
  else if (path.includes("/recordings")) permission = req.method === "PATCH" ? "recordings:manage" : "recordings:view";
  else if (path.includes("/campaigns")) permission = ["POST", "PATCH", "DELETE"].includes(req.method) ? "campaigns:manage" : "campaigns:view";
  else if (path.endsWith("/integration")) permission = "integration:view";
  else if (path === "/sites" || /^\/sites\/[^/]+$/.test(path)) {
    permission = ["POST", "PATCH", "DELETE"].includes(req.method) ? "sites:manage" : "sites:view";
  }
  if (!permission) return next();
  return requirePermission(permission)(req, res, next);
};
