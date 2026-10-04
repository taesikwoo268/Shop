import { z } from "zod";

const name = z.string().trim().min(1).max(100);
const password = z.string().min(8).max(72);
const addressId = { params: z.object({ id: z.string().min(1).max(191) }) };

const addressFields = {
  recipientName: name,
  phone: z.string().trim().regex(/^[0-9+().\s-]{7,20}$/, "Invalid phone number"),
  addressLine: z.string().trim().min(1).max(255),
  ward: z.string().trim().min(1).max(100),
  district: z.string().trim().min(1).max(100),
  province: z.string().trim().min(1).max(100),
  postalCode: z.string().trim().max(20).optional(),
  isDefault: z.boolean().optional(),
};

const requireAtLeastOneField = (value) => Object.keys(value).length > 0;

export const userSchemas = Object.freeze({
  updateProfile: {
    body: z
      .object({ firstName: name.optional(), lastName: name.optional() })
      .strict()
      .refine(requireAtLeastOneField, "At least one field is required"),
  },
  changePassword: {
    body: z
      .object({ currentPassword: password, newPassword: password })
      .refine((value) => value.currentPassword !== value.newPassword, {
        message: "New password must be different from current password",
        path: ["newPassword"],
      }),
  },
  createAddress: {
    body: z.object(addressFields).strict(),
  },
  updateAddress: {
    ...addressId,
    body: z
      .object(
        Object.fromEntries(
          Object.entries(addressFields).map(([key, schema]) => [key, schema.optional()]),
        ),
      )
      .strict()
      .refine(requireAtLeastOneField, "At least one field is required"),
  },
  addressId,
});
