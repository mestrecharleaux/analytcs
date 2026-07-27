import type { Request } from "express";
import geoip from "geoip-lite";
import { isbot } from "isbot";
import { DateTime } from "luxon";
import mongoose from "mongoose";
import { UAParser } from "ua-parser-js";
import { config } from "../config.js";
import { redis } from "../db.js";
import { PageView, ReplayChunk, Session, Site } from "../models.js";
import { deviceType, requestIp, validDomain } from "./tracking.js";

export type ReplayPayload = {
  siteKey: string;
  sessionId: string;
  sequence: number;
  events: Array<Record<string, unknown>>;
};

function eventDate(event: Record<string, unknown>, fallback: Date) {
  const value = typeof event.timestamp === "number" ? event.timestamp : fallback.getTime();
  return new Date(value);
}

function rageClickCount(events: ReplayPayload["events"]) {
  return events.filter((event) => {
    const data = event.data as { tag?: string } | undefined;
    return event.type === 5 && data?.tag === "akros:rage-click";
  }).length;
}

async function authorizedSite(siteKey: string, req: Request) {
  const site = await Site.findOne({ trackingKey: siteKey }).lean();
  if (!site || site.recording?.enabled === false) return null;
  const origin = req.get("origin") || req.get("referer");
  if (!origin) return null;
  try {
    const hostname = new URL(origin).hostname.toLowerCase();
    return config.COLLECTOR_ALLOW_ANY_ORIGIN || validDomain(hostname, site.domains) ? site : null;
  } catch {
    return null;
  }
}

export async function collectReplay(payload: ReplayPayload, req: Request) {
  const site = await authorizedSite(payload.siteKey, req);
  if (!site) return { status: 403, body: { error: "Gravação não autorizada." } };

  if (redis.status === "ready") {
    const limiter = `replay-rate:${site._id}:${requestIp(req)}`;
    const count = await redis.incr(limiter);
    if (count === 1) await redis.expire(limiter, 60);
    if (count > 240) return { status: 429, body: { error: "Limite de gravação excedido." } };
  }

  const now = new Date();
  const firstTimestamp = eventDate(payload.events[0] || {}, now);
  const lastTimestamp = eventDate(payload.events.at(-1) || {}, now);
  const byteSize = Buffer.byteLength(JSON.stringify(payload.events));
  const rageClicks = rageClickCount(payload.events);
  const expiresAt = DateTime.fromJSDate(now).plus({ days: config.REPLAY_RETENTION_DAYS }).toJSDate();
  const ip = requestIp(req);
  const geo = geoip.lookup(ip);
  const userAgent = req.get("user-agent") || "";
  const parser = new UAParser(userAgent);
  const existingSession = await Session.findOne({
    siteId: site._id,
    sessionId: payload.sessionId
  }).select("startedAt recordingStartedAt").lean();
  const recordingStartedAt = existingSession?.recordingStartedAt || existingSession?.startedAt || firstTimestamp;
  const recordingDurationMs = Math.max(0, lastTimestamp.getTime() - recordingStartedAt.getTime());

  try {
    await ReplayChunk.create({
      siteId: site._id,
      sessionId: payload.sessionId,
      sequence: payload.sequence,
      events: payload.events,
      firstTimestamp,
      lastTimestamp,
      byteSize,
      expiresAt
    });
  } catch (error) {
    if (error instanceof mongoose.mongo.MongoServerError && error.code === 11000) {
      return { status: 202, body: { accepted: true, duplicate: true } };
    }
    throw error;
  }

  await Session.findOneAndUpdate(
    { siteId: site._id, sessionId: payload.sessionId },
      {
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
        isBot: isbot(userAgent),
        userAgent,
        entryPage: "/",
        referrer: req.get("referer") || "",
        startedAt: firstTimestamp,
        recordingStartedAt
      },
      $set: { recordingLastEventAt: now, lastSeenAt: now, ip },
      $max: { recordingDurationMs },
      $inc: {
        recordingEventCount: payload.events.length,
        recordingBytes: byteSize,
        recordingRageClicks: rageClicks
      }
    },
    { upsert: true, new: true }
  );

  if (redis.status === "ready") {
    await Promise.allSettled([
      redis.zadd(`replay-live:${site._id}`, now.getTime(), payload.sessionId),
      redis.expire(`replay-live:${site._id}`, 3600),
      redis.publish(`replay:${site._id}:${payload.sessionId}`, JSON.stringify({ sequence: payload.sequence }))
    ]);
  }
  return { status: 202, body: { accepted: true } };
}

export async function listRecordings(
  siteId: string,
  options: { start: Date; endExclusive: Date; status?: string; device?: string; browser?: string }
) {
  const query: Record<string, unknown> = {
    siteId: new mongoose.Types.ObjectId(siteId),
    recordingEventCount: { $gt: 0 },
    startedAt: { $gte: options.start, $lt: options.endExclusive }
  };
  if (options.device && options.device !== "all") query.deviceType = options.device;
  if (options.browser && options.browser !== "all") query["browser.name"] = options.browser;
  if (options.status === "unwatched") query.recordingWatched = false;
  if (options.status === "rage") query.recordingRageClicks = { $gt: 0 };

  const sessions = await Session.find(query).sort({ recordingLastEventAt: -1 }).limit(250).lean();
  const sessionIds = sessions.map((session) => session.sessionId);
  const pageCounts = await PageView.aggregate([
    { $match: { siteId: new mongoose.Types.ObjectId(siteId), sessionId: { $in: sessionIds } } },
    { $group: { _id: "$sessionId", pages: { $addToSet: "$path" } } }
  ]);
  const pages = new Map(pageCounts.map((row) => [row._id, row.pages.length]));
  const liveThreshold = Date.now() - 60_000;

  return sessions.map((session) => ({
    sessionId: session.sessionId,
    visitor: `Visitante ${session.sessionId.slice(-6).toUpperCase()}`,
    location: session.location,
    browser: session.browser,
    os: session.os,
    deviceType: session.deviceType,
    entryPage: session.entryPage,
    referrer: session.referrer,
    startedAt: session.startedAt,
    lastEventAt: session.recordingLastEventAt,
    durationMs: session.recordingDurationMs || 0,
    eventCount: session.recordingEventCount || 0,
    pages: pages.get(session.sessionId) || 1,
    rageClicks: session.recordingRageClicks || 0,
    watched: session.recordingWatched || false,
    favorite: session.recordingFavorite || false,
    live: Boolean(session.recordingLastEventAt && new Date(session.recordingLastEventAt).getTime() >= liveThreshold)
  }));
}

export async function recordingDetails(siteId: string, sessionId: string) {
  const [session, chunks, pages] = await Promise.all([
    Session.findOne({ siteId, sessionId, recordingEventCount: { $gt: 0 } }).lean(),
    ReplayChunk.find({ siteId, sessionId }).sort({ sequence: 1 }).select("sequence events").lean(),
    PageView.find({ siteId, sessionId }).sort({ occurredAt: 1 }).select("path title occurredAt").lean()
  ]);
  if (!session) return null;
  return {
    session,
    pages,
    lastSequence: chunks.at(-1)?.sequence || 0,
    events: chunks.flatMap((chunk) => chunk.events)
  };
}
