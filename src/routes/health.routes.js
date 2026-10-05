import { Router } from "../http/router.js";
import { sendSuccess } from "../utils/api-response.js";

export const healthRouter = Router();

healthRouter.get("/", (_request, response) =>
  sendSuccess(response, { message: "Server is running" }),
);
