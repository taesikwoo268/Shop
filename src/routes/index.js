import { Router } from "express";
import { adminRouter } from "../modules/admin/admin.routes.js";
import { authRouter } from "../modules/auth/auth.routes.js";
import { cartRouter } from "../modules/carts/cart.routes.js";
import { categoryRouter } from "../modules/categories/category.routes.js";
import { orderRouter } from "../modules/orders/order.routes.js";
import { paymentRouter } from "../modules/payments/payment.routes.js";
import { productRouter } from "../modules/products/product.routes.js";
import { promotionRouter } from "../modules/promotions/promotion.routes.js";
import { reviewRouter } from "../modules/reviews/review.routes.js";
import { userRouter } from "../modules/users/user.routes.js";
import { healthRouter } from "./health.routes.js";

export const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/users", userRouter);
apiRouter.use("/products", productRouter);
apiRouter.use("/categories", categoryRouter);
apiRouter.use("/cart", cartRouter);
apiRouter.use("/orders", orderRouter);
apiRouter.use("/payments", paymentRouter);
apiRouter.use("/reviews", reviewRouter);
apiRouter.use("/promotions", promotionRouter);
apiRouter.use("/admin", adminRouter);
