import { Router } from "express";
import { DateTime } from "luxon";
import { nanoid } from "nanoid";
import { z } from "zod";
import { config } from "./config.js";
import { cacheGet, cacheSet, invalidateSiteCache } from "./db.js";
import { analyticsWindow, todayIn } from "./lib/dates.js";
import { Campaign, PageView, ReplayChunk, Session, Site } from "./models.js";
import { campaignDashboard, queryValues, siteDashboard } from "./services/analytics.js";
import { collectReplay, listRecordings, recordingDetails } from "./services/replay.js";
import { collectAccess, normalizeDomain } from "./services/tracking.js";
import { collectorPublicUrl, integrationScript, trackerFilePath } from "./tracker-assets.js";

export const apiRouter = Router();
export const collectorRouter = Router();

const colors = ["#6d5dfc", "#d946ef", "#0ea5e9", "#14b8a6", "#f97316", "#ec4899"];
const cleanDomain = normalizeDomain;
const siteInput = z.object({
  name: z.string().min(2).max(120),
  domains: z.array(z.string().min(3)).min(1).max(20),
  icon: z.string().nullable().optional(),
  timezone: z.string().default("America/Sao_Paulo")
});
const campaignInput = z.object({
  name: z.string().min(2).max(160),
  channel: z.enum(["google_ads", "facebook", "instagram", "whatsapp", "email", "linkedin", "organic", "other"]),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().nullable().optional(),
  status: z.enum(["draft", "scheduled", "active", "paused", "ended"]).default("draft"),
  utmCampaign: z.string().min(1).max(180),
  goalPath: z.string().nullable().optional(),
  notes: z.string().nullable().optional()
});
const period = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});

apiRouter.get("/health", (_req, res) => res.json({ ok: true }));

apiRouter.get("/sites", async (_req, res, next) => {
  try {
    const sites = await Site.find().sort({ createdAt: -1 }).lean();
    const today = DateTime.now().toISODate()!;
    const enriched = await Promise.all(
      sites.map(async (site) => {
        const window = todayIn(site.timezone);
        const [todayAccesses, activeCampaigns] = await Promise.all([
          PageView.countDocuments({ siteId: site._id, occurredAt: { $gte: window.startAt, $lt: window.endExclusive } }),
          Campaign.countDocuments({
            siteId: site._id,
            status: "active",
            startDate: { $lt: window.endExclusive },
            $or: [{ endDate: null }, { endDate: { $gte: window.startAt } }]
          })
        ]);
        return { ...site, todayAccesses, activeCampaigns };
      })
    );
    res.json(enriched);
  } catch (error) {
    next(error);
  }
});

apiRouter.post("/sites", async (req, res, next) => {
  try {
    const input = siteInput.parse(req.body);
    analyticsWindow("2026-01-01", "2026-01-01", input.timezone);
    const site = await Site.create({
      ...input,
      domains: [...new Set(input.domains.map(cleanDomain))],
      avatarColor: colors[Math.floor(Math.random() * colors.length)],
      trackingKey: `ak_${nanoid(24)}`
    });
    res.status(201).json(site);
  } catch (error) {
    next(error);
  }
});

apiRouter.get("/sites/:siteId", async (req, res, next) => {
  try {
    const site = await Site.findById(req.params.siteId).lean();
    if (!site) return res.status(404).json({ error: "Site não encontrado." });
    res.json(site);
  } catch (error) {
    next(error);
  }
});

apiRouter.patch("/sites/:siteId", async (req, res, next) => {
  try {
    const input = siteInput.partial().parse(req.body);
    const patch = { ...input, ...(input.domains ? { domains: [...new Set(input.domains.map(cleanDomain))] } : {}) };
    const site = await Site.findByIdAndUpdate(req.params.siteId, patch, { new: true, runValidators: true });
    if (!site) return res.status(404).json({ error: "Site não encontrado." });
    await invalidateSiteCache(req.params.siteId);
    res.json(site);
  } catch (error) {
    next(error);
  }
});

apiRouter.get("/sites/:siteId/dashboard", async (req, res, next) => {
  try {
    const query = period.parse(req.query);
    const key = `analytics:${req.params.siteId}:site:${query.start}:${query.end}`;
    const cached = await cacheGet(key);
    if (cached) return res.json(cached);
    const dashboard = await siteDashboard(req.params.siteId, query.start, query.end);
    if (!dashboard) return res.status(404).json({ error: "Site não encontrado." });
    await cacheSet(key, dashboard, config.CACHE_TTL_SECONDS);
    res.json(dashboard);
  } catch (error) {
    next(error);
  }
});

apiRouter.get("/sites/:siteId/query-keys/:key/values", async (req, res, next) => {
  try {
    const query = period.parse(req.query);
    const values = await queryValues(req.params.siteId, req.params.key, query.start, query.end);
    if (!values) return res.status(404).json({ error: "Site não encontrado." });
    res.json(values);
  } catch (error) {
    next(error);
  }
});

apiRouter.get("/sites/:siteId/recordings", async (req, res, next) => {
  try {
    const query = period.extend({
      status: z.string().optional(),
      device: z.string().optional(),
      browser: z.string().optional(),
      favorite: z.enum(["true", "false"]).transform((value) => value === "true").optional()
    }).parse(req.query);
    const site = await Site.findById(req.params.siteId).select("timezone").lean();
    if (!site) return res.status(404).json({ error: "Site não encontrado." });
    const window = analyticsWindow(query.start, query.end, site.timezone);
    const recordings = await listRecordings(req.params.siteId, {
      start: window.startAt,
      endExclusive: window.endExclusive,
      status: query.status,
      device: query.device,
      browser: query.browser,
      favorite: query.favorite
    });
    res.json(recordings);
  } catch (error) {
    next(error);
  }
});

apiRouter.get("/sites/:siteId/recordings/live", async (req, res, next) => {
  try {
    const site = await Site.findById(req.params.siteId).select("_id").lean();
    if (!site) return res.status(404).json({ error: "Site não encontrado." });
    res.setHeader("content-type", "text/event-stream");
    res.setHeader("cache-control", "no-cache, no-transform");
    res.setHeader("connection", "keep-alive");
    res.flushHeaders();

    let closed = false;
    const send = async () => {
      if (closed) return;
      const start = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const live = (await listRecordings(req.params.siteId, { start, endExclusive: new Date() })).filter((item) => item.live);
      res.write(`event: live\ndata: ${JSON.stringify(live)}\n\n`);
    };
    await send();
    const timer = setInterval(() => void send(), 3_000);
    req.on("close", () => {
      closed = true;
      clearInterval(timer);
    });
  } catch (error) {
    next(error);
  }
});

apiRouter.get("/sites/:siteId/recordings/:sessionId", async (req, res, next) => {
  try {
    const recording = await recordingDetails(req.params.siteId, req.params.sessionId);
    if (!recording) return res.status(404).json({ error: "Gravação não encontrada." });
    res.json(recording);
  } catch (error) {
    next(error);
  }
});

apiRouter.patch("/sites/:siteId/recordings/:sessionId", async (req, res, next) => {
  try {
    const input = z.object({ watched: z.boolean().optional(), favorite: z.boolean().optional() }).parse(req.body);
    const patch: Record<string, boolean> = {};
    if (input.watched !== undefined) patch.recordingWatched = input.watched;
    if (input.favorite !== undefined) patch.recordingFavorite = input.favorite;
    const session = await Session.findOneAndUpdate(
      { siteId: req.params.siteId, sessionId: req.params.sessionId },
      patch,
      { new: true }
    );
    if (!session) return res.status(404).json({ error: "Gravação não encontrada." });
    res.json({ watched: session.recordingWatched, favorite: session.recordingFavorite });
  } catch (error) {
    next(error);
  }
});

apiRouter.get("/sites/:siteId/recordings/:sessionId/stream", async (req, res, next) => {
  try {
    const exists = await Session.exists({ siteId: req.params.siteId, sessionId: req.params.sessionId });
    if (!exists) return res.status(404).json({ error: "Gravação não encontrada." });
    let after = Number(req.query.after || 0);
    let closed = false;
    res.setHeader("content-type", "text/event-stream");
    res.setHeader("cache-control", "no-cache, no-transform");
    res.setHeader("connection", "keep-alive");
    res.flushHeaders();

    const send = async () => {
      if (closed) return;
      const chunks = await ReplayChunk.find({
        siteId: req.params.siteId,
        sessionId: req.params.sessionId,
        sequence: { $gt: after }
      }).sort({ sequence: 1 }).lean();
      for (const chunk of chunks) {
        after = chunk.sequence;
        res.write(`event: events\ndata: ${JSON.stringify({ sequence: chunk.sequence, events: chunk.events })}\n\n`);
      }
      res.write(`event: heartbeat\ndata: ${Date.now()}\n\n`);
    };
    await send();
    const timer = setInterval(() => void send(), 1_500);
    req.on("close", () => {
      closed = true;
      clearInterval(timer);
    });
  } catch (error) {
    next(error);
  }
});

apiRouter.get("/sites/:siteId/campaigns", async (req, res, next) => {
  try {
    const campaigns = await Campaign.find({ siteId: req.params.siteId }).sort({ startDate: -1 }).lean();
    res.json(campaigns);
  } catch (error) {
    next(error);
  }
});

apiRouter.post("/sites/:siteId/campaigns", async (req, res, next) => {
  try {
    const input = campaignInput.parse(req.body);
    if (input.endDate && input.endDate < input.startDate) return res.status(422).json({ error: "A data final não pode anteceder a inicial." });
    const campaign = await Campaign.create({ ...input, siteId: req.params.siteId });
    await invalidateSiteCache(req.params.siteId);
    res.status(201).json(campaign);
  } catch (error) {
    next(error);
  }
});

apiRouter.patch("/sites/:siteId/campaigns/:campaignId", async (req, res, next) => {
  try {
    const input = campaignInput.partial().parse(req.body);
    const campaign = await Campaign.findOneAndUpdate({ _id: req.params.campaignId, siteId: req.params.siteId }, input, {
      new: true,
      runValidators: true
    });
    if (!campaign) return res.status(404).json({ error: "Campanha não encontrada." });
    await invalidateSiteCache(req.params.siteId);
    res.json(campaign);
  } catch (error) {
    next(error);
  }
});

apiRouter.get("/sites/:siteId/campaigns/:campaignId/dashboard", async (req, res, next) => {
  try {
    const query = period.parse(req.query);
    const dashboard = await campaignDashboard(req.params.siteId, req.params.campaignId, query.start, query.end);
    if (!dashboard) return res.status(404).json({ error: "Campanha não encontrada." });
    res.json(dashboard);
  } catch (error) {
    next(error);
  }
});

apiRouter.get("/sites/:siteId/integration", async (req, res, next) => {
  try {
    const site = await Site.findById(req.params.siteId).select("trackingKey domains").lean();
    if (!site) return res.status(404).json({ error: "Site não encontrado." });
    const publicUrl = collectorPublicUrl(req, config.API_PUBLIC_URL);
    const siteKeyQuery = `siteKey=${encodeURIComponent(site.trackingKey)}`;
    res.json({
      domains: site.domains,
      trackerUrl: `${publicUrl}/tracker.js`,
      collectUrl: `${publicUrl}/v1/collect?${siteKeyQuery}`,
      replayUrl: `${publicUrl}/v1/replay-events?${siteKeyQuery}`,
      script: integrationScript(publicUrl, site.trackingKey)
    });
  } catch (error) {
    next(error);
  }
});

collectorRouter.get("/tracker.js", (_req, res) => {
  res.type("application/javascript")
    .set("cache-control", "public, max-age=3600")
    .sendFile(trackerFilePath);
});

collectorRouter.post("/v1/collect", async (req, res, next) => {
  try {
    const input = z
      .object({
        siteKey: z.string().min(8),
        sessionId: z.string().min(8).max(120),
        url: z.string().url(),
        path: z.string().min(1).max(2048),
        title: z.string().max(500).optional(),
        referrer: z.string().max(4096).optional(),
        queryParams: z.record(z.string(), z.string()).optional()
      })
      .parse(req.body);
    const result = await collectAccess(input, req);
    res.status(result.status).json(result.body);
  } catch (error) {
    next(error);
  }
});

collectorRouter.post("/v1/replay-events", async (req, res, next) => {
  try {
    const input = z.object({
      siteKey: z.string().min(8),
      sessionId: z.string().min(8).max(120),
      sequence: z.number().int().nonnegative(),
      events: z.array(z.record(z.string(), z.unknown())).min(1).max(200)
    }).parse(req.body);
    const result = await collectReplay(input, req);
    res.status(result.status).json(result.body);
  } catch (error) {
    next(error);
  }
});
