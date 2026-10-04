import { PrismaClient } from "@prisma/client";
import { appConfig } from "../config/app.config.js";

const createPrismaClient = () =>
  new PrismaClient({
    log: appConfig.isProduction ? ["error"] : ["warn", "error"],
  });

export const prisma = globalThis.__prisma ?? createPrismaClient();

if (!appConfig.isProduction) {
  globalThis.__prisma = prisma;
}
