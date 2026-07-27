import mongoose from "mongoose";
import { Redis } from "ioredis";
import { config } from "./config.js";
import { detailedLogging, logger } from "./logger.js";
function safeEndpoint(value) {
    try {
        const url = new URL(value);
        const port = url.port ? `:${url.port}` : "";
        return `${url.protocol}//${url.hostname}${port}${url.pathname}`;
    }
    catch {
        return "endpoint configurado";
    }
}
export const redis = new Redis(config.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false
});
redis.on("error", (error) => {
    logger.error({ err: error, redis: { endpoint: safeEndpoint(config.REDIS_URL) } }, "Erro de conexão com Redis");
});
redis.on("connect", () => logger.debug("Conexão TCP com Redis estabelecida"));
redis.on("ready", () => logger.info("Redis pronto para cache e presença em tempo real"));
redis.on("reconnecting", (delay) => logger.warn({ retryInMs: delay }, "Redis reconectando"));
redis.on("end", () => logger.warn("Conexão com Redis encerrada"));
export async function connectDataStores() {
    const mongoStartedAt = performance.now();
    logger.debug({ mongodb: { endpoint: safeEndpoint(config.MONGODB_URI) } }, "Conectando ao MongoDB");
    await mongoose.connect(config.MONGODB_URI);
    logger.info({ mongodb: { endpoint: safeEndpoint(config.MONGODB_URI), durationMs: Math.round(performance.now() - mongoStartedAt) } }, "MongoDB conectado");
    if (redis.status === "wait") {
        const redisStartedAt = performance.now();
        logger.debug({ redis: { endpoint: safeEndpoint(config.REDIS_URL) } }, "Conectando ao Redis");
        try {
            await redis.connect();
            logger.debug({ redis: { durationMs: Math.round(performance.now() - redisStartedAt) } }, "Conexão com Redis concluída");
        }
        catch (error) {
            logger.warn({ err: error }, "Redis indisponível; a API seguirá sem cache");
        }
    }
}
export async function disconnectDataStores() {
    logger.debug("Desconectando MongoDB e Redis");
    await Promise.allSettled([mongoose.disconnect(), redis.quit()]);
}
export async function cacheGet(key) {
    if (redis.status !== "ready") {
        if (detailedLogging)
            logger.debug({ cache: { operation: "get", key, status: "unavailable" } }, "Cache ignorado");
        return null;
    }
    const value = await redis.get(key).catch(() => null);
    if (detailedLogging)
        logger.debug({ cache: { operation: "get", key, hit: Boolean(value) } }, "Consulta ao cache");
    return value ? JSON.parse(value) : null;
}
export async function cacheSet(key, value, ttl) {
    if (redis.status === "ready") {
        await redis.set(key, JSON.stringify(value), "EX", ttl).catch(() => undefined);
        if (detailedLogging)
            logger.debug({ cache: { operation: "set", key, ttl } }, "Valor armazenado no cache");
    }
}
export async function invalidateSiteCache(siteId) {
    if (redis.status !== "ready")
        return;
    let cursor = "0";
    do {
        const [next, keys] = await redis.scan(cursor, "MATCH", `analytics:${siteId}:*`, "COUNT", 100);
        cursor = next;
        if (keys.length)
            await redis.del(...keys);
    } while (cursor !== "0");
    if (detailedLogging)
        logger.debug({ cache: { operation: "invalidate", siteId } }, "Cache analítico invalidado");
}
