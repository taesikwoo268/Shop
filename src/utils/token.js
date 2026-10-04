import { createHash, randomUUID } from "node:crypto";

export const createTokenId = () => randomUUID();

export const hashToken = (token) =>
  createHash("sha256").update(token).digest("hex");

export const getTokenExpiry = (payload) => {
  if (!payload.exp) throw new Error("Token expiry is missing");
  return new Date(payload.exp * 1000);
};
