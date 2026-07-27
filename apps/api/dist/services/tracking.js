import geoip from "geoip-lite";
import { isbot } from "isbot";
import { UAParser } from "ua-parser-js";
import { Campaign, PageView, Session, Site } from "../models.js";
import { config } from "../config.js";
import { invalidateSiteCache, redis } from "../db.js";
export function normalizeDomain(value) {
    const candidate = value.trim().toLowerCase();
    try {
        return new URL(candidate.includes("://") ? candidate : `http://${candidate}`).hostname.replace(/\.$/, "");
    }
    catch {
        return candidate.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/:\d+$/, "").replace(/\.$/, "");
    }
}
export const validDomain = (hostname, domains) => {
    const normalizedHostname = normalizeDomain(hostname);
    return domains.some((value) => {
        const domain = normalizeDomain(value);
        return normalizedHostname === domain || normalizedHostname.endsWith(`.${domain}`);
    });
};
export function requestIp(req) {
    const forwarded = req.headers["x-forwarded-for"];
    const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0];
    return (raw || req.ip || req.socket.remoteAddress || "0.0.0.0").trim().replace(/^::ffff:/, "");
}
export function deviceType(parser) {
    const device = parser.getDevice();
    if (device.type === "mobile")
        return "Celular";
    if (device.type === "tablet")
        return "Tablet";
    if (device.type === "smarttv")
        return "TV";
    if (device.type === "wearable")
        return "Vestível";
    if (device.type === "console")
        return "Console";
    return "Computador";
}
export async function collectAccess(payload, req) {
    const site = await Site.findOne({ trackingKey: payload.siteKey }).lean();
    if (!site)
        return { status: 404, body: { error: "Site não encontrado." } };
    const origin = req.get("origin") || req.get("referer") || payload.url;
    let originHost = "";
    try {
        originHost = new URL(origin).hostname.toLowerCase();
    }
    catch {
        return { status: 400, body: { error: "Origem inválida." } };
    }
    if (!config.COLLECTOR_ALLOW_ANY_ORIGIN && !validDomain(originHost, site.domains)) {
        return { status: 403, body: { error: "Domínio não autorizado." } };
    }
    if (redis.status === "ready") {
        const limiter = `rate:${site._id}:${requestIp(req)}`;
        const count = await redis.incr(limiter);
        if (count === 1)
            await redis.expire(limiter, 60);
        if (count > 180)
            return { status: 429, body: { error: "Limite de coleta excedido." } };
    }
    const now = new Date();
    const ip = requestIp(req);
    const geo = geoip.lookup(ip);
    const userAgent = req.get("user-agent") || "";
    const parser = new UAParser(userAgent);
    const bot = isbot(userAgent);
    const params = Object.fromEntries(Object.entries(payload.queryParams || {})
        .slice(0, 40)
        .map(([key, value]) => [key.slice(0, 80), String(value).slice(0, 500)]));
    const utmCampaign = params.utm_campaign;
    const campaign = utmCampaign
        ? await Campaign.findOne({ siteId: site._id, utmCampaign, status: { $in: ["active", "scheduled"] } }).select("_id").lean()
        : null;
    await Promise.all([
        Session.findOneAndUpdate({ siteId: site._id, sessionId: payload.sessionId }, {
            $setOnInsert: {
                location: {
                    city: geo?.city || "Desconhecida",
                    region: geo?.region || "",
                    country: geo?.country || "",
                    latitude: geo?.ll?.[0],
                    longitude: geo?.ll?.[1]
                },
                browser: parser.getBrowser(),
                os: parser.getOS(),
                deviceType: deviceType(parser),
                isBot: bot,
                userAgent,
                entryPage: payload.path,
                referrer: payload.referrer || "",
                queryParams: params,
                startedAt: now
            },
            $set: { lastSeenAt: now, ip }
        }, { upsert: true, new: true }),
        PageView.create({
            siteId: site._id,
            sessionId: payload.sessionId,
            campaignId: campaign?._id || null,
            path: payload.path.slice(0, 2048),
            url: payload.url.slice(0, 4096),
            title: payload.title?.slice(0, 500),
            referrer: payload.referrer?.slice(0, 4096),
            queryParams: params,
            isBot: bot,
            occurredAt: now
        })
    ]);
    await invalidateSiteCache(String(site._id));
    return { status: 202, body: { accepted: true } };
}
