import { Router } from "express";
import { validate } from "../../middlewares/validation.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { CategoryController } from "./category.controller.js";
import { CategoryRepository } from "./category.repository.js";
import { CategoryService } from "./category.service.js";
import { categorySchemas } from "./category.validation.js";

export const categoryRouter = Router();
export const adminCategoryRouter = Router();

const repository = new CategoryRepository();
const service = new CategoryService(repository);
const controller = new CategoryController(service);

categoryRouter.get("/", asyncHandler(controller.listPublic));
categoryRouter.get(
  "/:slug",
  validate(categorySchemas.slug),
  asyncHandler(controller.getPublicBySlug),
);

adminCategoryRouter.get("/", asyncHandler(controller.listAdmin));
adminCategoryRouter.post(
  "/",
  validate(categorySchemas.create),
  asyncHandler(controller.create),
);
adminCategoryRouter.patch(
  "/:id",
  validate(categorySchemas.update),
  asyncHandler(controller.update),
);
adminCategoryRouter.delete(
  "/:id",
  validate(categorySchemas.id),
  asyncHandler(controller.delete),
);
