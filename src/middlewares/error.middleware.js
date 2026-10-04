import { appConfig } from "../config/app.config.js";
import { AppError } from "../errors/app.error.js";
import { sendError } from "../utils/api-response.js";
import { logger } from "../utils/logger.js";

export const errorHandler = (error, request, response, _next) => {
  const isOperational = error instanceof AppError && error.isOperational;
  const statusCode = isOperational ? error.statusCode : 500;
  const message = isOperational ? error.message : "Internal server error";

  if (statusCode >= 500) {
    logger.error({ err: error, requestId: request.id }, "Request failed");
  }

  const details = isOperational
    ? error.details
    : appConfig.isProduction
      ? undefined
      : error.message;

  return sendError(response, { statusCode, message, details });
};
