import { fileURLToPath } from "node:url";
export const trackerFilePath = fileURLToPath(new URL("../dist/public/tracker.js", import.meta.url));
export function collectorPublicUrl(req, configuredUrl) {
    const configured = configuredUrl?.trim();
    if (configured)
        return configured.replace(/\/+$/, "");
    const host = req.get("host");
    if (!host)
        throw new Error("Não foi possível determinar o host público da API.");
    return `${req.protocol}://${host}`;
}
export function integrationScript(publicUrl, trackingKey) {
    return `<script async src="${publicUrl}/tracker.js?v=3" data-site="${trackingKey}" data-recording="on"></script>`;
}
