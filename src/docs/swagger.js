import swaggerUi from "swagger-ui-express";
import { openApiDocument } from "./openapi.js";

export const mountSwagger = (app) => {
  app.get("/api-docs.json", (_request, response) => response.json(openApiDocument));
  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(openApiDocument, {
      customSiteTitle: "Shop Backend API Docs",
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
      },
    }),
  );
};
