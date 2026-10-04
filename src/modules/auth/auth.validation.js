import { z } from "zod";

const email = z.string().trim().email().max(191).transform((value) => value.toLowerCase());
const password = z.string().min(8).max(72);
const refreshToken = z.string().min(1);

export const authSchemas = Object.freeze({
  register: {
    body: z.object({
      email,
      password,
      firstName: z.string().trim().min(1).max(100).optional(),
      lastName: z.string().trim().min(1).max(100).optional(),
    }),
  },
  login: {
    body: z.object({ email, password }),
  },
  refresh: {
    body: z.object({ refreshToken }),
  },
  logout: {
    body: z.object({ refreshToken }),
  },
});
