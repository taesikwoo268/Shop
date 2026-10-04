import { app } from "./app.js";
import { appConfig } from "./config/app.config.js";
import { prisma } from "./database/prisma.js";
import { logger } from "./utils/logger.js";

const server = app.listen(appConfig.port, () => {
  logger.info(
    { port: appConfig.port, env: appConfig.env },
    `Server is running at http://localhost:${appConfig.port}${appConfig.apiPrefix}`,
  );
});

let isShuttingDown = false;

const shutdown = async (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info({ signal }, "Graceful shutdown started");
  server.close(async () => {
    await prisma.$disconnect();
    logger.info("Server stopped");
    process.exit(0);
  });
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

process.on("unhandledRejection", (error) => {
  logger.error({ err: error }, "Unhandled promise rejection");
});

process.on("uncaughtException", (error) => {
  logger.fatal({ err: error }, "Uncaught exception");
  process.exit(1);
});
