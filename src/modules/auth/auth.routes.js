import { Router } from "../../http/router.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { AuthController } from "./auth.controller.js";
import { AuthRepository } from "./auth.repository.js";
import { AuthService } from "./auth.service.js";
import { authSchemas } from "./auth.validation.js";

export const authRouter = Router();

const repository = new AuthRepository();
const service = new AuthService(repository);
const controller = new AuthController(service);

authRouter.post(
  "/register",
  validate(authSchemas.register),
  asyncHandler(controller.register),
);
authRouter.post(
  "/login",
  validate(authSchemas.login),
  asyncHandler(controller.login),
);
authRouter.post(
  "/refresh-token",
  validate(authSchemas.refresh),
  asyncHandler(controller.refresh),
);
authRouter.post(
  "/logout",
  validate(authSchemas.logout),
  asyncHandler(controller.logout),
);
