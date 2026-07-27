import mongoose from "mongoose";
import { Campaign, PageView, Session, Site } from "../models.js";
import { analyticsWindow } from "../lib/dates.js";
const normalized = (rows, fallback = "Desconhecido") => rows.map((row) => ({ name: row._id || fallback, count: row.count }));
function topFlows(views) {
    const sessions = new Map();
    for (const view of views) {
        const paths = sessions.get(view.sessionId) || [];
        if (paths.at(-1) !== view.path)
            paths.push(view.path);
        sessions.set(view.sessionId, paths);
    }
    const edges = new Map();
    for (const paths of sessions.values()) {
        for (let index = 0; index < paths.length - 1; index++) {
            const edge = `${paths[index]}→${paths[index + 1]}`;
            edges.set(edge, (edges.get(edge) || 0) + 1);
        }
    }
    return [...edges.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
        .map(([edge, count]) => {
        const [from, to] = edge.split("→");
        return { from, to, count };
    });
}
function queryKeyCounts(views) {
    const counts = new Map();
    for (const view of views) {
        const pairs = view.queryParams instanceof Map ? [...view.queryParams.entries()] : Object.entries(view.queryParams || {});
        for (const [key] of pairs)
            counts.set(key, (counts.get(key) || 0) + 1);
    }
    return [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([key, count]) => ({ key, count }));
}
export async function siteDashboard(siteId, start, end) {
    const site = await Site.findById(siteId).lean();
    if (!site)
        return null;
    const window = analyticsWindow(start, end, site.timezone);
    const objectId = new mongoose.Types.ObjectId(siteId);
    const viewMatch = { siteId: objectId, occurredAt: { $gte: window.startAt, $lt: window.endExclusive } };
    const sessionMatch = { siteId: objectId, startedAt: { $gte: window.startAt, $lt: window.endExclusive } };
    const [totalViews, realViews, uniqueSessions, daily, pages, locations, browsers, systems, devices, rawViews, activeCampaigns] = await Promise.all([
        PageView.countDocuments(viewMatch),
        PageView.countDocuments({ ...viewMatch, isBot: false }),
        Session.countDocuments({ ...sessionMatch, isBot: false }),
        PageView.aggregate([
            { $match: { ...viewMatch, isBot: false } },
            { $group: { _id: { $dateToString: { date: "$occurredAt", format: "%Y-%m-%d", timezone: window.timezone } }, count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]),
        PageView.aggregate([
            { $match: viewMatch },
            { $group: { _id: "$path", total: { $sum: 1 }, real: { $sum: { $cond: ["$isBot", 0, 1] } } } },
            { $sort: { real: -1 } },
            { $limit: 25 }
        ]),
        Session.aggregate([
            { $match: { ...sessionMatch, isBot: false } },
            {
                $group: {
                    _id: {
                        city: "$location.city",
                        region: "$location.region",
                        country: "$location.country",
                        latitude: "$location.latitude",
                        longitude: "$location.longitude"
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 80 }
        ]),
        Session.aggregate([{ $match: { ...sessionMatch, isBot: false } }, { $group: { _id: "$browser.name", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
        Session.aggregate([{ $match: { ...sessionMatch, isBot: false } }, { $group: { _id: "$os.name", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
        Session.aggregate([{ $match: { ...sessionMatch, isBot: false } }, { $group: { _id: "$deviceType", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
        PageView.find(viewMatch).select("sessionId path queryParams occurredAt").sort({ occurredAt: 1 }).limit(50000).lean(),
        Campaign.countDocuments({
            siteId: objectId,
            status: "active",
            startDate: { $lt: window.endExclusive },
            $or: [{ endDate: null }, { endDate: { $gte: window.startAt } }]
        })
    ]);
    return {
        site,
        period: { start, end, timezone: window.timezone },
        kpis: {
            totalViews,
            realViews,
            robotViews: totalViews - realViews,
            uniqueSessions,
            pagesPerSession: uniqueSessions ? Number((realViews / uniqueSessions).toFixed(2)) : 0,
            activeCampaigns
        },
        daily: daily.map((item) => ({ date: item._id, count: item.count })),
        pages: pages.map((item) => ({ path: item._id, real: item.real, total: item.total })),
        locations: locations.map((item) => ({ ...item._id, count: item.count })),
        browsers: normalized(browsers),
        operatingSystems: normalized(systems),
        devices: normalized(devices),
        queryKeys: queryKeyCounts(rawViews),
        flows: topFlows(rawViews)
    };
}
export async function queryValues(siteId, key, start, end) {
    const site = await Site.findById(siteId).lean();
    if (!site)
        return null;
    const window = analyticsWindow(start, end, site.timezone);
    const rows = await PageView.aggregate([
        {
            $match: {
                siteId: new mongoose.Types.ObjectId(siteId),
                occurredAt: { $gte: window.startAt, $lt: window.endExclusive },
                [`queryParams.${key}`]: { $exists: true }
            }
        },
        { $group: { _id: `$queryParams.${key}`, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 100 }
    ]);
    return rows.map((row) => ({ value: row._id, count: row.count }));
}
export async function campaignDashboard(siteId, campaignId, start, end) {
    const campaign = await Campaign.findOne({ _id: campaignId, siteId }).lean();
    const site = await Site.findById(siteId).lean();
    if (!campaign || !site)
        return null;
    const window = analyticsWindow(start, end, site.timezone);
    const match = {
        siteId: new mongoose.Types.ObjectId(siteId),
        campaignId: new mongoose.Types.ObjectId(campaignId),
        occurredAt: { $gte: window.startAt, $lt: window.endExclusive }
    };
    const [views, realViews, sessions, pages, daily] = await Promise.all([
        PageView.countDocuments(match),
        PageView.countDocuments({ ...match, isBot: false }),
        PageView.distinct("sessionId", { ...match, isBot: false }),
        PageView.aggregate([{ $match: match }, { $group: { _id: "$path", total: { $sum: 1 }, real: { $sum: { $cond: ["$isBot", 0, 1] } } } }, { $sort: { real: -1 } }, { $limit: 15 }]),
        PageView.aggregate([
            { $match: { ...match, isBot: false } },
            { $group: { _id: { $dateToString: { date: "$occurredAt", format: "%Y-%m-%d", timezone: window.timezone } }, count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ])
    ]);
    return {
        campaign,
        period: { start, end },
        kpis: { totalViews: views, realViews, sessions: sessions.length, robotViews: views - realViews },
        pages: pages.map((item) => ({ path: item._id, real: item.real, total: item.total })),
        daily: daily.map((item) => ({ date: item._id, count: item.count }))
    };
}
