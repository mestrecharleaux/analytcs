import dotenv from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
dotenv.config({ path: resolve(process.cwd(), ".env"), quiet: true });
dotenv.config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)), quiet: true });
const booleanString = z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true");
export const config = z
    .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).optional(),
    PORT: z.coerce.number().default(4000),
    WEB_URL: z.string().default("http://localhost:3000"),
    API_PUBLIC_URL: z.preprocess((value) => (typeof value === "string" && value.trim() === "" ? undefined : value), z.string().url().optional()),
    MONGODB_URI: z.string().default("mongodb://localhost:27017/akros-pulse"),
    REDIS_URL: z.string().default("redis://localhost:6379"),
    TRUST_PROXY: booleanString,
    COLLECTOR_ALLOW_ANY_ORIGIN: booleanString,
    JWT_SECRET: z.string().min(32).default("dev-only-change-this-jwt-secret-32chars"),
    JWT_TTL_SECONDS: z.coerce.number().int().positive().default(900),
    AUTH_SESSION_TTL_DAYS: z.coerce.number().int().positive().default(30),
    BOOTSTRAP_ADMIN_EMAIL: z.string().email().default("admin@akros.local"),
    BOOTSTRAP_ADMIN_PASSWORD: z.string().min(8).default("ChangeMe123!"),
    IP_RETENTION_DAYS: z.coerce.number().int().positive().default(90),
    REPLAY_RETENTION_DAYS: z.coerce.number().int().positive().default(30),
    CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(90)
})
    .parse(process.env);
