import { z } from "zod";

const idParams = { params: z.object({ id: z.string().min(1).max(191) }) };
const slugParams = {
  params: z.object({ slug: z.string().trim().min(1).max(120) }),
};

const categoryFields = {
  name: z.string().trim().min(2).max(100),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must use lowercase letters, numbers, and hyphens")
    .optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  imageUrl: z.string().trim().url().max(500).nullable().optional(),
  parentId: z.string().min(1).max(191).nullable().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).max(1_000_000).optional(),
};

export const categorySchemas = Object.freeze({
  slug: slugParams,
  id: idParams,
  create: { body: z.object(categoryFields).strict() },
  update: {
    ...idParams,
    body: z
      .object(
        Object.fromEntries(
          Object.entries(categoryFields).map(([key, schema]) => [key, schema.optional()]),
        ),
      )
      .strict()
      .refine((value) => Object.keys(value).length > 0, "At least one field is required"),
  },
});
