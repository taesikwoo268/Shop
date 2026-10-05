export const hashPassword = (password) =>
  Bun.password.hash(password, {
    algorithm: "argon2id",
    memoryCost: 65536,
    timeCost: 3,
  });

export const comparePassword = (password, hash) =>
  Bun.password.verify(password, hash);
