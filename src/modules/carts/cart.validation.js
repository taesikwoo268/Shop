import { z } from "zod";

const quantity = z.coerce.number().int().min(1).max(99);

export const cartSchemas = Object.freeze({
  addItem: {
    body: z.object({ variantId: z.string().min(1).max(191), quantity }).strict(),
  },
  updateItem: {
    params: z.object({ itemId: z.string().min(1).max(191) }),
    body: z.object({ quantity }).strict(),
  },
  itemId: {
    params: z.object({ itemId: z.string().min(1).max(191) }),
  },
});
