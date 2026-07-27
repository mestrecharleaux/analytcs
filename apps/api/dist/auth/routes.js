import { Router } from "express";
import QRCode from "qrcode";
import { generateSecret, generateURI, verify } from "otplib";
import { z } from "zod";
import { redis } from "../db.js";
import { User } from "../models.js";
import { requireAuth, requirePermission } from "./middleware.js";
import { clearAuthCookies, createAuthSession, hashPassword, invalidateSession, rotateRefreshToken, verifyPassword } from "./service.js";
export const authRouter = Router();
const publicUser = (user, permissions = []) => ({
    id: String(user._id),
    name: user.name,
    email: user.email,
    avatar: user.avatar || null,
    fixed: Boolean(user.fixed),
    mfaEnabled: Boolean(user.mfaDevices?.length),
    mfaDevices: (user.mfaDevices || []).map((device) => ({
        id: String(device._id),
        name: device.name,
        createdAt: device.createdAt
    })),
    permissions
});
authRouter.post("/login", async (req, res, next) => {
    try {
        const input = z.object({
            email: z.string().email(),
            password: z.string().min(1),
            code: z.string().regex(/^\d{6}$/).optional()
        }).parse(req.body);
        const user = await User.findOne({ email: input.email.toLowerCase(), active: true });
        if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
            return res.status(401).json({ error: "Email ou senha inválidos." });
        }
        if (user.mfaDevices.length) {
            if (!input.code)
                return res.status(428).json({ error: "Código MFA necessário.", mfaRequired: true });
            const checks = await Promise.all(user.mfaDevices.map((device) => verify({ secret: device.secret, token: input.code })));
            if (!checks.some((result) => result.valid))
                return res.status(401).json({ error: "Código MFA inválido." });
        }
        await createAuthSession(String(user._id), req, res);
        res.json({ user: publicUser(user) });
    }
    catch (error) {
        next(error);
    }
});
authRouter.post("/refresh", async (req, res, next) => {
    try {
        const session = await rotateRefreshToken(req, res);
        if (!session) {
            clearAuthCookies(res);
            return res.status(401).json({ error: "Refresh token inválido ou já utilizado." });
        }
        res.json({ refreshed: true });
    }
    catch (error) {
        next(error);
    }
});
authRouter.post("/logout", requireAuth, async (req, res, next) => {
    try {
        await invalidateSession(req.auth.sessionToken);
        clearAuthCookies(res);
        res.status(204).send();
    }
    catch (error) {
        next(error);
    }
});
authRouter.get("/me", requireAuth, async (req, res, next) => {
    try {
        const auth = req.auth;
        const user = await User.findById(auth.userId).lean();
        if (!user)
            return res.status(404).json({ error: "Usuário não encontrado." });
        res.json(publicUser(user, auth.permissions));
    }
    catch (error) {
        next(error);
    }
});
authRouter.patch("/profile", requireAuth, requirePermission("profile:manage"), async (req, res, next) => {
    try {
        const input = z.object({
            name: z.string().min(2).max(120).optional(),
            avatar: z.string().max(700_000).nullable().optional()
        }).parse(req.body);
        const user = await User.findByIdAndUpdate(req.auth.userId, input, { new: true, runValidators: true }).lean();
        if (!user)
            return res.status(404).json({ error: "Usuário não encontrado." });
        res.json(publicUser(user, req.auth.permissions));
    }
    catch (error) {
        next(error);
    }
});
authRouter.post("/profile/password", requireAuth, requirePermission("profile:manage"), async (req, res, next) => {
    try {
        const input = z.object({ password: z.string().min(8).max(200) }).parse(req.body);
        await User.updateOne({ _id: req.auth.userId }, { $set: { passwordHash: await hashPassword(input.password) } });
        res.status(204).send();
    }
    catch (error) {
        next(error);
    }
});
authRouter.post("/profile/mfa/setup", requireAuth, requirePermission("profile:manage"), async (req, res, next) => {
    try {
        if (redis.status !== "ready")
            return res.status(503).json({ error: "Redis necessário para configurar MFA." });
        const input = z.object({ name: z.string().min(2).max(80) }).parse(req.body);
        const user = await User.findById(req.auth.userId).select("email").lean();
        if (!user)
            return res.status(404).json({ error: "Usuário não encontrado." });
        const secret = generateSecret();
        const uri = generateURI({ issuer: "Akros Pulse", label: user.email, secret });
        await redis.set(`auth:mfa-setup:${user._id}`, JSON.stringify({ secret, name: input.name }), "EX", 600);
        res.json({ secret, uri, qrCode: await QRCode.toDataURL(uri) });
    }
    catch (error) {
        next(error);
    }
});
authRouter.post("/profile/mfa/confirm", requireAuth, requirePermission("profile:manage"), async (req, res, next) => {
    try {
        const input = z.object({ code: z.string().regex(/^\d{6}$/) }).parse(req.body);
        const userId = req.auth.userId;
        const pending = redis.status === "ready" ? await redis.get(`auth:mfa-setup:${userId}`) : null;
        if (!pending)
            return res.status(410).json({ error: "Configuração MFA expirada." });
        const setup = JSON.parse(pending);
        if (!(await verify({ secret: setup.secret, token: input.code })).valid) {
            return res.status(422).json({ error: "Código TOTP inválido." });
        }
        await User.updateOne({ _id: userId }, { $push: { mfaDevices: { name: setup.name, secret: setup.secret, createdAt: new Date() } } });
        await redis.del(`auth:mfa-setup:${userId}`);
        res.status(201).json({ enabled: true });
    }
    catch (error) {
        next(error);
    }
});
authRouter.delete("/profile/mfa/:deviceId", requireAuth, requirePermission("profile:manage"), async (req, res, next) => {
    try {
        await User.updateOne({ _id: req.auth.userId }, { $pull: { mfaDevices: { _id: req.params.deviceId } } });
        res.status(204).send();
    }
    catch (error) {
        next(error);
    }
});
