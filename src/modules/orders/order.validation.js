import { z } from "zod";

const id = z.string().min(1).max(191);
const statuses = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
];

export const orderSchemas = Object.freeze({
  create: {
    body: z.object({
      addressId: id,
      note: z.string().trim().max(500).optional(),
    }).strict(),
  },
  list: {
    query: z.object({
      page: z.coerce.number().int().positive().default(1),
      limit: z.coerce.number().int().positive().max(100).default(20),
      status: z.enum(statuses).optional(),
    }),
  },
  id: { params: z.object({ id }) },
  updateStatus: {
    ...{ params: z.object({ id }) },
    body: z.object({ status: z.enum(statuses) }).strict(),
  },
});
