export type Site = {
  _id: string;
  name: string;
  domains: string[];
  icon?: string | null;
  avatarColor: string;
  trackingKey: string;
  timezone: string;
  todayAccesses?: number;
  activeCampaigns?: number;
};

export type Campaign = {
  _id: string;
  siteId: string;
  name: string;
  channel: string;
  startDate: string;
  endDate?: string | null;
  status: string;
  utmCampaign: string;
  goalPath?: string | null;
};

export type Dashboard = {
  site: Site;
  period: { start: string; end: string; timezone: string };
  kpis: {
    totalViews: number;
    realViews: number;
    robotViews: number;
    uniqueSessions: number;
    pagesPerSession: number;
    activeCampaigns: number;
  };
  daily: Array<{ date: string; count: number }>;
  pages: Array<{ path: string; real: number; total: number }>;
  locations: Array<{ city?: string; region?: string; country?: string; latitude?: number; longitude?: number; count: number }>;
  browsers: Array<{ name: string; count: number }>;
  operatingSystems: Array<{ name: string; count: number }>;
  devices: Array<{ name: string; count: number }>;
  queryKeys: Array<{ key: string; count: number }>;
  flows: Array<{ from: string; to: string; count: number }>;
};

export type Recording = {
  sessionId: string;
  visitor: string;
  location?: { city?: string; region?: string; country?: string };
  browser?: { name?: string; version?: string };
  os?: { name?: string; version?: string };
  deviceType: string;
  entryPage?: string;
  referrer?: string;
  startedAt: string;
  lastEventAt?: string;
  durationMs: number;
  eventCount: number;
  pages: number;
  rageClicks: number;
  watched: boolean;
  favorite: boolean;
  live: boolean;
};

export type RecordingDetails = {
  session: Record<string, any>;
  pages: Array<{ path: string; title?: string; occurredAt: string }>;
  lastSequence: number;
  events: Array<Record<string, any>>;
};
