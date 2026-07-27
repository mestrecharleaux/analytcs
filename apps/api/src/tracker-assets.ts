import type { Request } from "express";
import { fileURLToPath } from "node:url";

type RequestOrigin = Pick<Request, "protocol" | "get">;

export const trackerFilePath = fileURLToPath(
  new URL("../dist/public/tracker.js", import.meta.url)
);

export function collectorPublicUrl(req: RequestOrigin, configuredUrl?: string) {
  const configured = configuredUrl?.trim();
  if (configured) return configured.replace(/\/+$/, "");

  const host = req.get("host");
  if (!host) throw new Error("Não foi possível determinar o host público da API.");
  return `${req.protocol}://${host}`;
}

export function integrationScript(publicUrl: string, trackingKey: string) {
  return `<script async src="${publicUrl}/tracker.js?v=3" data-site="${trackingKey}" data-recording="on"></script>`;
}
