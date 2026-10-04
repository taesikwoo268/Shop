import bcrypt from "bcrypt";

const DEFAULT_SALT_ROUNDS = 12;

export const hashPassword = (password) =>
  bcrypt.hash(password, DEFAULT_SALT_ROUNDS);

export const comparePassword = (password, hash) =>
  bcrypt.compare(password, hash);
