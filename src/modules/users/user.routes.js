import { Router } from "express";
import { authenticate } from "../../middlewares/authentication.middleware.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { UserController } from "./user.controller.js";
import { UserRepository } from "./user.repository.js";
import { UserService } from "./user.service.js";
import { userSchemas } from "./user.validation.js";

export const userRouter = Router();

const repository = new UserRepository();
const service = new UserService(repository);
const controller = new UserController(service);

userRouter.use(authenticate);

userRouter.get("/me", asyncHandler(controller.getMe));
userRouter.patch(
  "/me",
  validate(userSchemas.updateProfile),
  asyncHandler(controller.updateMe),
);
userRouter.patch(
  "/me/password",
  validate(userSchemas.changePassword),
  asyncHandler(controller.changePassword),
);
userRouter.get("/me/addresses", asyncHandler(controller.listAddresses));
userRouter.post(
  "/me/addresses",
  validate(userSchemas.createAddress),
  asyncHandler(controller.createAddress),
);
userRouter.patch(
  "/me/addresses/:id",
  validate(userSchemas.updateAddress),
  asyncHandler(controller.updateAddress),
);
userRouter.delete(
  "/me/addresses/:id",
  validate(userSchemas.addressId),
  asyncHandler(controller.deleteAddress),
);
userRouter.patch(
  "/me/addresses/:id/default",
  validate(userSchemas.addressId),
  asyncHandler(controller.setDefaultAddress),
);
