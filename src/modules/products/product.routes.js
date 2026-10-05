import { Router } from "../../http/router.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { ProductController } from "./product.controller.js";
import { ProductRepository } from "./product.repository.js";
import { ProductService } from "./product.service.js";
import { productSchemas } from "./product.validation.js";

export const productRouter = Router();
export const adminProductRouter = Router();

const repository = new ProductRepository();
const service = new ProductService(repository);
const controller = new ProductController(service);

productRouter.get(
  "/",
  validate(productSchemas.publicList),
  asyncHandler(controller.listPublic),
);
productRouter.get(
  "/:slug",
  validate(productSchemas.slug),
  asyncHandler(controller.getPublicBySlug),
);

adminProductRouter.get(
  "/",
  validate(productSchemas.adminList),
  asyncHandler(controller.listAdmin),
);
adminProductRouter.post(
  "/",
  validate(productSchemas.create),
  asyncHandler(controller.create),
);
adminProductRouter.get(
  "/:id",
  validate(productSchemas.id),
  asyncHandler(controller.getAdminById),
);
adminProductRouter.patch(
  "/:id",
  validate(productSchemas.update),
  asyncHandler(controller.update),
);
adminProductRouter.delete(
  "/:id",
  validate(productSchemas.id),
  asyncHandler(controller.archive),
);
adminProductRouter.post(
  "/:id/images",
  validate(productSchemas.createImage),
  asyncHandler(controller.createImage),
);
adminProductRouter.patch(
  "/:productId/images/:childId",
  validate(productSchemas.updateImage),
  asyncHandler(controller.updateImage),
);
adminProductRouter.delete(
  "/:productId/images/:childId",
  validate(productSchemas.childId),
  asyncHandler(controller.deleteImage),
);
adminProductRouter.post(
  "/:id/variants",
  validate(productSchemas.createVariant),
  asyncHandler(controller.createVariant),
);
adminProductRouter.patch(
  "/:productId/variants/:childId",
  validate(productSchemas.updateVariant),
  asyncHandler(controller.updateVariant),
);
adminProductRouter.delete(
  "/:productId/variants/:childId",
  validate(productSchemas.childId),
  asyncHandler(controller.archiveVariant),
);
adminProductRouter.patch(
  "/:productId/variants/:childId/inventory",
  validate(productSchemas.inventory),
  asyncHandler(controller.setInventory),
);
