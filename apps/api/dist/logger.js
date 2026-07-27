import { randomUUID } from "node:crypto";
import pino from "pino";
import { pinoHttp } from "pino-http";
import { config } from "./config.js";
export const detailedLogging = config.NODE_ENV === "development";
export function resolveLogLevel(environment, configuredLevel) {
    if (configuredLevel)
        return configuredLevel;
    if (environment === "test")
        return "silent";
    return environment === "development" ? "debug" : "info";
}
export function safeUrlDetails(value = "/") {
    try {
        const url = new URL(value, "http://akros.local");
        return {
            path: url.pathname,
            queryKeys: [...new Set(url.searchParams.keys())]
        };
    }
    catch {
        return { path: value.split("?")[0] || "/", queryKeys: [] };
    }
}
function safeRequestId(req) {
    const received = req.headers["x-request-id"];
    return typeof received === "string" && received.trim() ? received.slice(0, 120) : randomUUID();
}
export function requestDetails(req) {
    return {
        id: req.id,
        method: req.method,
        path: req.path,
        queryKeys: Object.keys(req.query || {}),
        ip: req.ip,
        userAgent: req.get("user-agent"),
        contentType: req.get("content-type"),
        contentLength: req.get("content-length"),
        origin: req.get("origin")
    };
}
export const logger = pino({
    name: "akros-pulse-api",
    level: resolveLogLevel(config.NODE_ENV, config.LOG_LEVEL),
    base: detailedLogging ? undefined : { service: "akros-pulse-api", environment: config.NODE_ENV },
    redact: {
        paths: [
            "req.headers.authorization",
            "req.headers.cookie",
            "request.headers.authorization",
            "request.headers.cookie",
            "*.password",
            "*.token",
            "*.secret",
            "*.events"
        ],
        censor: "[REDACTED]"
    },
    transport: detailedLogging
        ? {
            target: "pino-pretty",
            options: {
                colorize: true,
                translateTime: "SYS:HH:MM:ss.l",
                ignore: "pid,hostname",
                singleLine: false
            }
        }
        : undefined
});
export const httpLogger = pinoHttp({
    logger,
    serializers: {
        req(req) {
            const url = safeUrlDetails(req.url);
            return {
                id: req.id,
                method: req.method,
                ...url,
                remoteAddress: req.remoteAddress,
                remotePort: req.remotePort,
                userAgent: req.raw?.headers["user-agent"],
                contentType: req.raw?.headers["content-type"],
                contentLength: req.raw?.headers["content-length"]
            };
        }
    },
    genReqId(req, res) {
        const id = safeRequestId(req);
        res.setHeader("x-request-id", id);
        return id;
    },
    customLogLevel(_req, res, error) {
        if (error || res.statusCode >= 500)
            return "error";
        if (res.statusCode >= 400)
            return "warn";
        return "info";
    },
    customSuccessMessage(req, res) {
        return `${req.method} ${safeUrlDetails(req.url).path} concluída com ${res.statusCode}`;
    },
    customErrorMessage(req, res) {
        return `${req.method} ${safeUrlDetails(req.url).path} falhou com ${res.statusCode}`;
    }
});
