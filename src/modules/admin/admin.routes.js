import { Router } from "../../http/router.js";
import { authenticate } from "../../middlewares/authentication.middleware.js";
import { authorize } from "../../middlewares/authorization.middleware.js";
import { adminCategoryRouter } from "../categories/category.routes.js";
import { adminProductRouter } from "../products/product.routes.js";
import { adminOrderRouter } from "../orders/order.routes.js";

export const adminRouter = Router();

adminRouter.use(authenticate, authorize("ADMIN"));
adminRouter.use("/categories", adminCategoryRouter);
adminRouter.use("/products", adminProductRouter);
adminRouter.use("/orders", adminOrderRouter);
