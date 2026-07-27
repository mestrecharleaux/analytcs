import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import type { Request, Response } from "express";
import { SignJWT, jwtVerify } from "jose";
import { nanoid } from "nanoid";
import { config } from "../config.js";
import { redis } from "../db.js";
import { AuthSession, Group, User } from "../models.js";
import { requestIp } from "../services/tracking.js";

const accessCookie = "akros_access";
const refreshCookie = "akros_refresh";
const redisTtl = 3600;
const jwtSecret = new TextEncoder().encode(config.JWT_SECRET);

type CachedSession = { userId: string; permissions: string[] };

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: config.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge
  };
}

export function clearAuthCookies(res: Response) {
  const options = { httpOnly: true, secure: config.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };
  res.clearCookie(accessCookie, options);
  res.clearCookie(refreshCookie, options);
}

function hashToken(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

async function userPermissions(userId: string) {
  const user = await User.findById(userId).select("groups active").lean();
  if (!user?.active) return null;
  const groups = await Group.find({ _id: { $in: user.groups || [] } }).select("permissions").lean();
  return [...new Set(groups.flatMap((group) => group.permissions))];
}

async function cacheSession(sessionToken: string, value: CachedSession) {
  if (redis.status === "ready") {
    await redis.set(`auth:session:${sessionToken}`, JSON.stringify(value), "EX", redisTtl);
  }
}

export async function resolveSession(sessionToken: string): Promise<CachedSession | null> {
  if (redis.status === "ready") {
    const cached = await redis.get(`auth:session:${sessionToken}`);
    if (cached) return JSON.parse(cached) as CachedSession;
  }

  const session = await AuthSession.findOne({
    sessionToken,
    invalidatedAt: null,
    expiresAt: { $gt: new Date() }
  }).lean();
  if (!session) return null;
  const permissions = await userPermissions(String(session.userId));
  if (!permissions) return null;
  const value = { userId: String(session.userId), permissions };
  await cacheSession(sessionToken, value);
  return value;
}

export async function signAccessToken(sessionToken: string, userId: string) {
  return new SignJWT({ sid: sessionToken })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setJti(nanoid())
    .setIssuedAt()
    .setExpirationTime(`${config.JWT_TTL_SECONDS}s`)
    .sign(jwtSecret);
}

export async function verifyAccessToken(token: string) {
  const { payload } = await jwtVerify(token, jwtSecret);
  if (typeof payload.sid !== "string" || typeof payload.sub !== "string") throw new Error("Token inválido.");
  return { sessionToken: payload.sid, userId: payload.sub };
}

export function accessTokenFrom(req: Request) {
  return req.cookies?.[accessCookie] as string | undefined;
}

export async function createAuthSession(userId: string, req: Request, res: Response) {
  const sessionToken = nanoid(40);
  const refreshSecret = randomBytes(48).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + config.AUTH_SESSION_TTL_DAYS * 86400000);
  const permissions = await userPermissions(userId);
  if (!permissions) throw new Error("Usuário inativo.");

  await AuthSession.create({
    sessionToken,
    userId,
    refreshTokenHash: hashToken(refreshSecret),
    userAgent: req.get("user-agent") || "",
    ip: requestIp(req),
    expiresAt,
    lastSeenAt: now
  });
  await cacheSession(sessionToken, { userId, permissions });
  const accessToken = await signAccessToken(sessionToken, userId);
  res.cookie(accessCookie, accessToken, cookieOptions(config.JWT_TTL_SECONDS * 1000));
  res.cookie(refreshCookie, `${sessionToken}.${refreshSecret}`, cookieOptions(config.AUTH_SESSION_TTL_DAYS * 86400000));
}

export async function rotateRefreshToken(req: Request, res: Response) {
  const raw = req.cookies?.[refreshCookie] as string | undefined;
  if (!raw) return null;
  const separator = raw.indexOf(".");
  if (separator < 1) return null;
  const sessionToken = raw.slice(0, separator);
  const currentSecret = raw.slice(separator + 1);
  const nextSecret = randomBytes(48).toString("base64url");
  const session = await AuthSession.findOneAndUpdate(
    {
      sessionToken,
      refreshTokenHash: hashToken(currentSecret),
      invalidatedAt: null,
      expiresAt: { $gt: new Date() }
    },
    {
      $set: {
        refreshTokenHash: hashToken(nextSecret),
        lastSeenAt: new Date(),
        userAgent: req.get("user-agent") || "",
        ip: requestIp(req)
      }
    },
    { new: true }
  ).lean();
  if (!session) return null;
  const resolved = await resolveSession(sessionToken);
  if (!resolved) return null;
  const accessToken = await signAccessToken(sessionToken, String(session.userId));
  res.cookie(accessCookie, accessToken, cookieOptions(config.JWT_TTL_SECONDS * 1000));
  res.cookie(refreshCookie, `${sessionToken}.${nextSecret}`, cookieOptions(
    Math.max(0, session.expiresAt.getTime() - Date.now())
  ));
  return resolved;
}

export async function invalidateSession(sessionToken: string) {
  await AuthSession.updateOne({ sessionToken }, { $set: { invalidatedAt: new Date() } });
  if (redis.status === "ready") await redis.del(`auth:session:${sessionToken}`);
}

export async function invalidateUserSessionCaches(userIds: string[]) {
  if (redis.status !== "ready" || !userIds.length) return;
  const sessions = await AuthSession.find({
    userId: { $in: userIds },
    invalidatedAt: null,
    expiresAt: { $gt: new Date() }
  }).select("sessionToken").lean();
  const keys = sessions.map((session) => `auth:session:${session.sessionToken}`);
  if (keys.length) await redis.del(...keys);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export async function ensureBootstrapAuth() {
  let group = await Group.findOne({ name: "Administradores" });
  if (!group) group = await Group.create({ name: "Administradores", permissions: ["*"], fixed: true });
  const email = config.BOOTSTRAP_ADMIN_EMAIL.toLowerCase();
  if (!(await User.exists({ email }))) {
    await User.create({
      name: "Administrador",
      email,
      passwordHash: await hashPassword(config.BOOTSTRAP_ADMIN_PASSWORD),
      groups: [group._id],
      active: true,
      fixed: true
    });
  }
}
