import mongoose, { Schema } from "mongoose";

const siteSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    domains: [{ type: String, required: true, lowercase: true, trim: true }],
    icon: { type: String, default: null },
    avatarColor: { type: String, required: true },
    trackingKey: { type: String, required: true, unique: true, index: true },
    timezone: { type: String, default: "America/Sao_Paulo" },
    recording: {
      enabled: { type: Boolean, default: true },
      sampleRate: { type: Number, min: 0, max: 1, default: 1 },
      maskAllInputs: { type: Boolean, default: true }
    }
  },
  { timestamps: true }
);

const campaignSchema = new Schema(
  {
    siteId: { type: Schema.Types.ObjectId, ref: "Site", required: true, index: true },
    name: { type: String, required: true, trim: true },
    channel: {
      type: String,
      enum: ["google_ads", "facebook", "instagram", "whatsapp", "email", "linkedin", "organic", "other"],
      required: true
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, default: null },
    status: { type: String, enum: ["draft", "scheduled", "active", "paused", "ended"], default: "draft" },
    utmCampaign: { type: String, trim: true, index: true },
    goalPath: { type: String, trim: true, default: null },
    notes: { type: String, default: null }
  },
  { timestamps: true }
);
campaignSchema.index({ siteId: 1, status: 1, startDate: -1 });

const sessionSchema = new Schema(
  {
    siteId: { type: Schema.Types.ObjectId, ref: "Site", required: true, index: true },
    sessionId: { type: String, required: true },
    ip: { type: String, required: true },
    location: {
      city: String,
      region: String,
      country: String,
      latitude: Number,
      longitude: Number
    },
    browser: { name: String, version: String },
    os: { name: String, version: String },
    deviceType: { type: String, required: true },
    isBot: { type: Boolean, default: false, index: true },
    userAgent: String,
    entryPage: String,
    referrer: String,
    queryParams: { type: Map, of: String },
    startedAt: { type: Date, required: true },
    lastSeenAt: { type: Date, required: true },
    recordingStartedAt: Date,
    recordingLastEventAt: { type: Date, index: true },
    recordingDurationMs: { type: Number, default: 0 },
    recordingEventCount: { type: Number, default: 0 },
    recordingBytes: { type: Number, default: 0 },
    recordingRageClicks: { type: Number, default: 0 },
    recordingWatched: { type: Boolean, default: false },
    recordingFavorite: { type: Boolean, default: false }
  },
  { timestamps: true }
);
sessionSchema.index({ siteId: 1, sessionId: 1 }, { unique: true });
sessionSchema.index({ siteId: 1, startedAt: -1 });

const pageViewSchema = new Schema(
  {
    siteId: { type: Schema.Types.ObjectId, ref: "Site", required: true, index: true },
    sessionId: { type: String, required: true, index: true },
    campaignId: { type: Schema.Types.ObjectId, ref: "Campaign", default: null, index: true },
    path: { type: String, required: true },
    url: { type: String, required: true },
    title: String,
    referrer: String,
    queryParams: { type: Map, of: String },
    isBot: { type: Boolean, default: false, index: true },
    occurredAt: { type: Date, required: true, index: true }
  },
  { timestamps: true }
);
pageViewSchema.index({ siteId: 1, occurredAt: -1 });
pageViewSchema.index({ siteId: 1, path: 1, occurredAt: -1 });

const replayChunkSchema = new Schema(
  {
    siteId: { type: Schema.Types.ObjectId, ref: "Site", required: true, index: true },
    sessionId: { type: String, required: true, index: true },
    sequence: { type: Number, required: true },
    events: [{ type: Schema.Types.Mixed, required: true }],
    firstTimestamp: { type: Date, required: true },
    lastTimestamp: { type: Date, required: true },
    byteSize: { type: Number, required: true },
    expiresAt: { type: Date, required: true }
  },
  { timestamps: true }
);
replayChunkSchema.index({ siteId: 1, sessionId: 1, sequence: 1 }, { unique: true });
replayChunkSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    avatar: { type: String, default: null },
    active: { type: Boolean, default: true },
    fixed: { type: Boolean, default: false },
    groups: [{ type: Schema.Types.ObjectId, ref: "Group" }],
    mfaDevices: [{
      name: { type: String, required: true, trim: true },
      secret: { type: String, required: true },
      createdAt: { type: Date, default: Date.now }
    }]
  },
  { timestamps: true }
);

const groupSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true, maxlength: 120 },
    permissions: [{ type: String, required: true, trim: true }],
    fixed: { type: Boolean, default: false }
  },
  { timestamps: true }
);

const authSessionSchema = new Schema(
  {
    sessionToken: { type: String, required: true, unique: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    refreshTokenHash: { type: String, required: true },
    userAgent: { type: String, default: "" },
    ip: { type: String, default: "" },
    expiresAt: { type: Date, required: true, index: true },
    lastSeenAt: { type: Date, required: true },
    invalidatedAt: { type: Date, default: null, index: true }
  },
  { timestamps: true }
);

export const Site = mongoose.model("Site", siteSchema);
export const Campaign = mongoose.model("Campaign", campaignSchema);
export const Session = mongoose.model("Session", sessionSchema);
export const PageView = mongoose.model("PageView", pageViewSchema);
export const ReplayChunk = mongoose.model("ReplayChunk", replayChunkSchema);
export const User = mongoose.model("User", userSchema);
export const Group = mongoose.model("Group", groupSchema);
export const AuthSession = mongoose.model("AuthSession", authSessionSchema);
