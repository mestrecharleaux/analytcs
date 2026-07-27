import { app } from "./app.js";
import { ensureBootstrapAuth } from "./auth/service.js";
import { config } from "./config.js";
import { connectDataStores, disconnectDataStores } from "./db.js";
import { detailedLogging, logger } from "./logger.js";
await connectDataStores();
await ensureBootstrapAuth();
const server = app.listen(config.PORT, () => {
    logger.info({
        server: {
            port: config.PORT,
            environment: config.NODE_ENV,
            webOrigins: config.WEB_URL.split(",").map((item) => item.trim()),
            trustProxy: config.TRUST_PROXY,
            detailedLogging
        }
    }, `Akros Pulse API disponível em http://localhost:${config.PORT}`);
});
server.on("error", (error) => {
    logger.fatal({ err: error }, "Falha no servidor HTTP");
});
async function shutdown(signal) {
    logger.info({ signal }, "Encerramento da API solicitado");
    server.close(async () => {
        await disconnectDataStores();
        logger.info("API encerrada com segurança");
        process.exit(0);
    });
}
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("unhandledRejection", (reason) => {
    logger.error({ err: reason }, "Promise rejeitada sem tratamento");
});
