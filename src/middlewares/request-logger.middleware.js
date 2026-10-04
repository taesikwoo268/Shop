import pinoHttp from "pino-http";
import { logger } from "../utils/logger.js";

export const requestLogger = pinoHttp({
  logger,
  redact: {
    paths: ["req.headers.authorization"],
    censor: "[REDACTED]",
  },
});
