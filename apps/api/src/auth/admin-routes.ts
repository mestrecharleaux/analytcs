import { Router } from "express";
import { z } from "zod";
import { Group, User } from "../models.js";
import { requirePermission } from "./middleware.js";
import { permissionLabels, permissions } from "./permissions.js";
import { hashPassword, invalidateUserSessionCaches } from "./service.js";

export const adminRouter = Router();
adminRouter.use(requirePermission("administration:access"));

const pageQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().default("")
});

adminRouter.get("/permissions", (_req, res) => {
  res.json(permissions.map((value) => ({ value, label: permissionLabels[value] })));
});

adminRouter.get("/users", requirePermission("users:view"), async (req, res, next) => {
  try {
    const query = pageQuery.parse(req.query);
    const filter = query.search
      ? { $or: [
          { name: { $regex: query.search, $options: "i" } },
          { email: { $regex: query.search, $options: "i" } }
        ] }
      : {};
    const [items, total] = await Promise.all([
      User.find(filter).select("-passwordHash -mfaDevices.secret").populate("groups", "name fixed").sort({ name: 1 })
        .skip((query.page - 1) * query.limit).limit(query.limit).lean(),
      User.countDocuments(filter)
    ]);
    res.json({ items, total, page: query.page, pages: Math.max(1, Math.ceil(total / query.limit)) });
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/users", requirePermission("users:manage"), async (req, res, next) => {
  try {
    const input = z.object({
      name: z.string().min(2).max(120),
      email: z.string().email(),
      password: z.string().min(8).max(200),
      groups: z.array(z.string()).default([]),
      active: z.boolean().default(true)
    }).parse(req.body);
    const user = await User.create({
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash: await hashPassword(input.password),
      groups: input.groups,
      active: input.active,
      fixed: false
    });
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/users/:userId", requirePermission("users:view"), async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId).select("-passwordHash -mfaDevices.secret").lean();
    if (!user) return res.status(404).json({ error: "Usuário não encontrado." });
    res.json(user);
  } catch (error) {
    next(error);
  }
});

adminRouter.patch("/users/:userId", requirePermission("users:manage"), async (req, res, next) => {
  try {
    const current = await User.findById(req.params.userId).select("fixed").lean();
    if (!current) return res.status(404).json({ error: "Usuário não encontrado." });
    if (current.fixed) return res.status(409).json({ error: "Usuários fixos não podem ser alterados." });
    const input = z.object({
      name: z.string().min(2).max(120).optional(),
      email: z.string().email().optional(),
      password: z.string().min(8).max(200).optional(),
      groups: z.array(z.string()).optional(),
      active: z.boolean().optional()
    }).parse(req.body);
    const { password, ...fields } = input;
    const patch = {
      ...fields,
      ...(fields.email ? { email: fields.email.toLowerCase() } : {}),
      ...(password ? { passwordHash: await hashPassword(password) } : {})
    };
    const user = await User.findByIdAndUpdate(req.params.userId, patch, { new: true, runValidators: true })
      .select("-passwordHash -mfaDevices.secret").lean();
    await invalidateUserSessionCaches([String(req.params.userId)]);
    res.json(user);
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/groups", requirePermission("groups:view"), async (_req, res, next) => {
  try {
    const groups = await Group.aggregate([
      { $lookup: { from: "users", localField: "_id", foreignField: "groups", as: "users" } },
      { $project: { name: 1, permissions: 1, fixed: 1, userCount: { $size: "$users" } } },
      { $sort: { name: 1 } }
    ]);
    res.json(groups);
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/groups", requirePermission("groups:manage"), async (req, res, next) => {
  try {
    const input = z.object({
      name: z.string().min(2).max(120),
      permissions: z.array(z.enum(permissions)).min(1)
    }).parse(req.body);
    const group = await Group.create({ ...input, permissions: [...new Set(input.permissions)], fixed: false });
    res.status(201).json(group);
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/groups/:groupId", requirePermission("groups:view"), async (req, res, next) => {
  try {
    const query = pageQuery.parse(req.query);
    const group = await Group.findById(req.params.groupId).lean();
    if (!group) return res.status(404).json({ error: "Grupo não encontrado." });
    const userFilter: Record<string, unknown> = { groups: group._id };
    if (query.search) {
      userFilter.$or = [
        { name: { $regex: query.search, $options: "i" } },
        { email: { $regex: query.search, $options: "i" } }
      ];
    }
    const [users, total] = await Promise.all([
      User.find(userFilter).select("name email avatar active fixed").sort({ name: 1 })
        .skip((query.page - 1) * query.limit).limit(query.limit).lean(),
      User.countDocuments(userFilter)
    ]);
    res.json({ group, users, total, page: query.page, pages: Math.max(1, Math.ceil(total / query.limit)) });
  } catch (error) {
    next(error);
  }
});

adminRouter.patch("/groups/:groupId", requirePermission("groups:manage"), async (req, res, next) => {
  try {
    const current = await Group.findById(req.params.groupId).lean();
    if (!current) return res.status(404).json({ error: "Grupo não encontrado." });
    if (current.fixed) return res.status(409).json({ error: "Grupos fixos não podem ser alterados." });
    const input = z.object({
      name: z.string().min(2).max(120).optional(),
      permissions: z.array(z.enum(permissions)).min(1).optional()
    }).parse(req.body);
    const group = await Group.findByIdAndUpdate(
      req.params.groupId,
      { ...input, ...(input.permissions ? { permissions: [...new Set(input.permissions)] } : {}) },
      { new: true, runValidators: true }
    ).lean();
    const affectedUsers = await User.find({ groups: req.params.groupId }).select("_id").lean();
    await invalidateUserSessionCaches(affectedUsers.map((user) => String(user._id)));
    res.json(group);
  } catch (error) {
    next(error);
  }
});
