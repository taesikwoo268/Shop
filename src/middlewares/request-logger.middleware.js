import { logger } from "../utils/logger.js";

export const requestLogger = async (request, response, next) => {
  const startedAt = performance.now();
  await next();
  logger.info(
    {
      requestId: request.id,
      method: request.method,
      url: request.originalUrl,
      statusCode: response.statusCode,
      responseTimeMs: Math.round((performance.now() - startedAt) * 100) / 100,
    },
    "Request completed",
  );
};
