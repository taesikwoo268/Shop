import { join } from "node:path";
import swaggerUiDist from "swagger-ui-dist";
import { openApiDocument } from "./openapi.js";

const swaggerAssetsPath = swaggerUiDist.getAbsoluteFSPath();

const swaggerHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Shop Backend API Docs</title>
    <link rel="stylesheet" href="/api-docs/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="/api-docs/swagger-ui-bundle.js"></script>
    <script>
      SwaggerUIBundle({
        url: "/api-docs.json",
        dom_id: "#swagger-ui",
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true
      });
    </script>
  </body>
</html>`;

export const mountSwagger = (router) => {
  router.get("/api-docs.json", (_request, response) => response.json(openApiDocument));
  router.get("/api-docs/swagger-ui.css", (_request, response) =>
    response.send(Bun.file(join(swaggerAssetsPath, "swagger-ui.css"))),
  );
  router.get("/api-docs/swagger-ui-bundle.js", (_request, response) =>
    response.send(Bun.file(join(swaggerAssetsPath, "swagger-ui-bundle.js"))),
  );
  const render = (_request, response) =>
    response.type("text/html; charset=utf-8").send(swaggerHtml);
  router.get("/api-docs", render);
  router.get("/api-docs/", render);
};
