import { env } from "./env.js";

export const appConfig = Object.freeze({
  name: "shop-backend",
  env: env.NODE_ENV,
  port: env.PORT,
  apiPrefix: "/api/v1",
  isProduction: env.NODE_ENV === "production",
});
