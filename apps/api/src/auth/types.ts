import type { Request } from "express";

export type AuthContext = {
  userId: string;
  sessionToken: string;
  permissions: string[];
};

export type AuthenticatedRequest = Request & { auth: AuthContext };
