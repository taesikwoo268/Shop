import { app } from "./app.js";
import { appConfig } from "./config/app.config.js";
import { prisma } from "./database/prisma.js";
import { logger } from "./utils/logger.js";

const server = Bun.serve({
  port: appConfig.port,
  fetch: app.fetch,
  error(error) {
    logger.error({ err: error }, "Unhandled HTTP error");
    return Response.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  },
});

logger.info(
  { port: server.port, env: appConfig.env },
  `Server is running at ${server.url}${appConfig.apiPrefix.slice(1)}`,
);

let isShuttingDown = false;

const shutdown = async (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info({ signal }, "Graceful shutdown started");
  await server.stop();
  await prisma.$disconnect();
  logger.info("Server stopped");
  process.exit(0);
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
