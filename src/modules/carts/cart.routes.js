import { Router } from "../../http/router.js";
import { authenticate } from "../../middlewares/authentication.middleware.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { CartController } from "./cart.controller.js";
import { CartRepository } from "./cart.repository.js";
import { CartService } from "./cart.service.js";
import { cartSchemas } from "./cart.validation.js";

export const cartRouter = Router();

const repository = new CartRepository();
const service = new CartService(repository);
const controller = new CartController(service);

cartRouter.use(authenticate);
cartRouter.get("/", asyncHandler(controller.get));
cartRouter.post(
  "/items",
  validate(cartSchemas.addItem),
  asyncHandler(controller.addItem),
);
cartRouter.patch(
  "/items/:itemId",
  validate(cartSchemas.updateItem),
  asyncHandler(controller.updateItem),
);
cartRouter.delete(
  "/items/:itemId",
  validate(cartSchemas.itemId),
  asyncHandler(controller.deleteItem),
);
cartRouter.delete("/", asyncHandler(controller.clear));
