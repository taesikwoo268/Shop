import jwt from "jsonwebtoken";
import { jwtConfig } from "../config/jwt.config.js";

export const signAccessToken = (payload) =>
  jwt.sign({ ...payload, type: "access" }, jwtConfig.accessSecret, {
    expiresIn: jwtConfig.accessExpiresIn,
  });

export const signRefreshToken = (payload) =>
  jwt.sign({ ...payload, type: "refresh" }, jwtConfig.refreshSecret, {
    expiresIn: jwtConfig.refreshExpiresIn,
  });

export const verifyAccessToken = (token) => {
  const payload = jwt.verify(token, jwtConfig.accessSecret);
  if (payload.type !== "access") throw new Error("Invalid token type");
  return payload;
};

export const verifyRefreshToken = (token) => {
  const payload = jwt.verify(token, jwtConfig.refreshSecret);
  if (payload.type !== "refresh") throw new Error("Invalid token type");
  return payload;
};
