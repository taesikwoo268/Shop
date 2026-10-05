import { Router } from "../../http/router.js";
import { authenticate } from "../../middlewares/authentication.middleware.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { OrderController } from "./order.controller.js";
import { OrderRepository } from "./order.repository.js";
import { OrderService } from "./order.service.js";
import { orderSchemas } from "./order.validation.js";

export const orderRouter = Router();
export const adminOrderRouter = Router();

const repository = new OrderRepository();
const service = new OrderService(repository);
const controller = new OrderController(service);

orderRouter.use(authenticate);
orderRouter.post(
  "/",
  validate(orderSchemas.create),
  asyncHandler(controller.create),
);
orderRouter.get(
  "/",
  validate(orderSchemas.list),
  asyncHandler(controller.list),
);
orderRouter.get(
  "/:id",
  validate(orderSchemas.id),
  asyncHandler(controller.get),
);
orderRouter.post(
  "/:id/cancel",
  validate(orderSchemas.id),
  asyncHandler(controller.cancel),
);

adminOrderRouter.get(
  "/",
  validate(orderSchemas.list),
  asyncHandler(controller.listAdmin),
);
adminOrderRouter.get(
  "/:id",
  validate(orderSchemas.id),
  asyncHandler(controller.getAdmin),
);
adminOrderRouter.patch(
  "/:id/status",
  validate(orderSchemas.updateStatus),
  asyncHandler(controller.updateStatus),
);
