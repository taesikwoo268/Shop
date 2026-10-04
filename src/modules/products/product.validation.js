import { z } from "zod";

const id = z.string().min(1).max(191);
const idParams = { params: z.object({ id }) };
const slugParams = {
  params: z.object({ slug: z.string().trim().min(1).max(180) }),
};
const productChildParams = {
  params: z.object({ productId: id, childId: id }),
};

const money = z
  .union([
    z.string().trim().regex(/^\d{1,10}(?:\.\d{1,2})?$/, "Invalid money value"),
    z.number().positive().max(9_999_999_999.99),
  ])
  .transform((value) => Number(value).toFixed(2))
  .refine((value) => Number(value) > 0, "Money value must be greater than zero");

const nullableMoney = z.union([money, z.null()]);

const variantFields = {
  name: z.string().trim().min(1).max(160),
  sku: z.string().trim().min(1).max(100).transform((value) => value.toUpperCase()),
  attributes: z.record(z.string(), z.string()).optional(),
  price: money,
  compareAtPrice: nullableMoney.optional(),
  isActive: z.boolean().optional(),
};

const validateVariantPrice = (value, context) => {
  if (
    value.compareAtPrice != null &&
    value.price != null &&
    Number(value.compareAtPrice) < Number(value.price)
  ) {
    context.addIssue({
      code: "custom",
      message: "Compare-at price must be greater than or equal to price",
      path: ["compareAtPrice"],
    });
  }
};

const createVariant = z
  .object({
    ...variantFields,
    quantity: z.coerce.number().int().min(0).max(1_000_000).default(0),
  })
  .strict()
  .superRefine(validateVariantPrice);

const imageFields = {
  url: z.string().trim().url().max(500),
  altText: z.string().trim().max(200).nullable().optional(),
  sortOrder: z.coerce.number().int().min(0).max(1_000_000).optional(),
  isPrimary: z.boolean().optional(),
};

const productFields = {
  name: z.string().trim().min(2).max(160),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(180)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug")
    .optional(),
  description: z.string().trim().max(20_000).nullable().optional(),
  brand: z.string().trim().max(100).nullable().optional(),
  categoryId: id,
  isActive: z.boolean().optional(),
};

const optionalObject = (fields) =>
  z
    .object(
      Object.fromEntries(
        Object.entries(fields).map(([key, schema]) => [key, schema.optional()]),
      ),
    )
    .strict()
    .refine((value) => Object.keys(value).length > 0, "At least one field is required");

export const productSchemas = Object.freeze({
  publicList: {
    query: z
      .object({
        page: z.coerce.number().int().positive().default(1),
        limit: z.coerce.number().int().positive().max(100).default(20),
        search: z.string().trim().max(100).optional(),
        category: z.string().trim().max(120).optional(),
        minPrice: money.optional(),
        maxPrice: money.optional(),
        sort: z
          .enum(["newest", "price_asc", "price_desc", "name_asc"])
          .default("newest"),
      })
      .refine(
        (value) =>
          value.minPrice == null ||
          value.maxPrice == null ||
          Number(value.minPrice) <= Number(value.maxPrice),
        { message: "minPrice must not exceed maxPrice", path: ["minPrice"] },
      ),
  },
  slug: slugParams,
  adminList: {
    query: z.object({
      page: z.coerce.number().int().positive().default(1),
      limit: z.coerce.number().int().positive().max(100).default(20),
      search: z.string().trim().max(100).optional(),
    }),
  },
  create: {
    body: z
      .object({
        ...productFields,
        variants: z.array(createVariant).min(1).max(100),
        images: z.array(z.object(imageFields).strict()).max(20).optional(),
      })
      .strict(),
  },
  update: { ...idParams, body: optionalObject(productFields) },
  id: idParams,
  createImage: { ...idParams, body: z.object(imageFields).strict() },
  updateImage: { ...productChildParams, body: optionalObject(imageFields) },
  childId: productChildParams,
  createVariant: { ...idParams, body: createVariant },
  updateVariant: {
    ...productChildParams,
    body: optionalObject(variantFields).superRefine(validateVariantPrice),
  },
  inventory: {
    ...productChildParams,
    body: z.object({
      quantity: z.coerce.number().int().min(0).max(1_000_000),
    }),
  },
});
