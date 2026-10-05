import { appConfig } from "./config/app.config.js";
import { mountSwagger } from "./docs/swagger.js";
import { Router } from "./http/router.js";
import { errorHandler } from "./middlewares/error.middleware.js";
import { notFoundHandler } from "./middlewares/not-found.middleware.js";
import { requestLogger } from "./middlewares/request-logger.middleware.js";
import { apiRouter } from "./routes/index.js";

export const createApp = () => {
  const router = Router();
  router.use(requestLogger);
  mountSwagger(router);
  router.use(appConfig.apiPrefix, apiRouter);
  return {
    fetch: (request) => router.handle(request, { errorHandler, notFoundHandler }),
  };
};

export const app = createApp();
