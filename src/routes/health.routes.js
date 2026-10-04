import { Router } from "express";
import { sendSuccess } from "../utils/api-response.js";

export const healthRouter = Router();

healthRouter.get("/", (_request, response) =>
  sendSuccess(response, { message: "Server is running" }),
);
