import pino from "pino";
import { appConfig } from "../config/app.config.js";

export const logger = pino({
  name: appConfig.name,
  level:
    appConfig.env === "test"
      ? "silent"
      : appConfig.isProduction
        ? "info"
        : "debug",
});
