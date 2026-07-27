import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { ZodError } from "zod";
import { config } from "./config.js";
import { adminRouter } from "./auth/admin-routes.js";
import { requireApiPermission, requireAuth } from "./auth/middleware.js";
import { authRouter } from "./auth/routes.js";
import { detailedLogging, httpLogger, requestDetails } from "./logger.js";
import { collectorCors } from "./middleware/collector-cors.js";
import { apiRouter, collectorRouter } from "./routes.js";

export const app = express();

if (config.TRUST_PROXY) app.set("trust proxy", 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(compression());
app.use(httpLogger);
if (detailedLogging) {
  app.use((req, _res, next) => {
    req.log.debug({ request: requestDetails(req) }, "Requisição recebida");
    next();
  });
}
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use("/tracker.js", cors({ origin: "*" }));
app.use("/v1", collectorCors);
app.use(collectorRouter);
app.use("/api", cors({ origin: config.WEB_URL.split(",").map((item) => item.trim()), credentials: true }));
app.use("/api/auth", authRouter);
app.use("/api", requireAuth);
app.use("/api/admin", adminRouter);
app.use("/api", requireApiPermission);
app.use("/api", apiRouter);

app.use((_req, res) => res.status(404).json({ error: "Rota não encontrada." }));
app.use((error: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof ZodError) {
    req.log.warn(
      {
        requestId: req.id,
        validationIssues: error.issues.map((issue) => ({
          path: issue.path.join("."),
          code: issue.code,
          message: issue.message
        }))
      },
      "Requisição rejeitada por validação"
    );
    return res.status(422).json({ error: "Dados inválidos.", details: error.issues });
  }
  req.log.error({ err: error, requestId: req.id }, "Erro não tratado durante a requisição");
  const message = error instanceof Error ? error.message : "Erro interno.";
  res.status(500).json({ error: config.NODE_ENV === "production" ? "Erro interno." : message });
});
