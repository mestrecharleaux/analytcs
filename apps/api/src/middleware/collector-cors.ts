import type { Request, RequestHandler } from "express";
import { config } from "../config.js";
import { Site } from "../models.js";
import { validDomain } from "../services/tracking.js";

function siteKeyFrom(req: Request) {
  const queryKey = req.query.siteKey;
  if (typeof queryKey === "string") return queryKey;
  const body = req.body as { siteKey?: unknown } | undefined;
  return typeof body?.siteKey === "string" ? body.siteKey : undefined;
}

export function originMatchesDomains(origin: string, domains: string[]) {
  try {
    const hostname = new URL(origin).hostname.toLowerCase().replace(/\.$/, "");
    return validDomain(hostname, domains);
  } catch {
    return false;
  }
}

export type CollectorDomainLookup = (siteKey: string) => Promise<string[] | null>;

const mongoDomainLookup: CollectorDomainLookup = async (siteKey) => {
  const site = await Site.findOne({ trackingKey: siteKey }).select("domains").lean();
  return site?.domains || null;
};

export function createCollectorCors(
  domainLookup: CollectorDomainLookup = mongoDomainLookup,
  allowAnyOrigin = config.COLLECTOR_ALLOW_ANY_ORIGIN
): RequestHandler {
  return async (req, res, next) => {
    try {
      const origin = req.get("origin");
      if (!origin) return next();

      if (!allowAnyOrigin) {
        const siteKey = siteKeyFrom(req);
        if (!siteKey) return res.status(403).json({ error: "Chave do site ausente na validação de origem." });

        const domains = await domainLookup(siteKey);
        if (!domains || !originMatchesDomains(origin, domains)) {
          return res.status(403).json({ error: "Origem não autorizada para esta chave de site." });
        }
      }

      res.vary("Origin");
      res.setHeader("access-control-allow-origin", origin);
      res.setHeader("access-control-allow-credentials", "true");
      res.setHeader("access-control-allow-methods", "POST, OPTIONS");
    res.setHeader("access-control-allow-headers", "content-type");
    res.setHeader("access-control-max-age", "86400");
    if (req.get("access-control-request-private-network") === "true") {
      res.setHeader("access-control-allow-private-network", "true");
    }
    if (req.get("access-control-request-local-network") === "true") {
      res.setHeader("access-control-allow-local-network", "true");
    }

    if (req.method === "OPTIONS") return res.sendStatus(204);
      next();
    } catch (error) {
      next(error);
    }
  };
};

export const collectorCors = createCollectorCors();
