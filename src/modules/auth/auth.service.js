import { ConflictError } from "../../errors/conflict.error.js";
import { UnauthorizedError } from "../../errors/unauthorized.error.js";
import { comparePassword, hashPassword } from "../../utils/password.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../../utils/jwt.js";
import {
  createTokenId,
  getTokenExpiry,
  hashToken,
} from "../../utils/token.js";

const toPublicUser = (user) => ({
  id: user.id,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  status: user.status,
  role: user.role.name,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

export class AuthService {
  constructor(repository) {
    this.repository = repository;
  }

  async register(input) {
    const existingUser = await this.repository.findUserByEmail(input.email);
    if (existingUser) throw new ConflictError("Email is already registered");

    try {
      const user = await this.repository.createCustomer({
        ...input,
        passwordHash: await hashPassword(input.password),
      });
      const tokens = await this.#issueTokens(user);
      return { user: toPublicUser(user), tokens };
    } catch (error) {
      if (error.code === "P2002") {
        throw new ConflictError("Email is already registered");
      }
      throw error;
    }
  }

  async login({ email, password }) {
    const user = await this.repository.findUserByEmail(email);
    const isValid = user && (await comparePassword(password, user.passwordHash));

    if (!isValid) throw new UnauthorizedError("Invalid email or password");
    if (user.status !== "ACTIVE") {
      throw new UnauthorizedError("User account is not active");
    }

    return { user: toPublicUser(user), tokens: await this.#issueTokens(user) };
  }

  async refresh(refreshToken) {
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedError("Invalid or expired refresh token");
    }

    const storedToken = await this.repository.findActiveRefreshToken(
      hashToken(refreshToken),
    );
    if (!storedToken || storedToken.userId !== payload.sub) {
      throw new UnauthorizedError("Invalid or expired refresh token");
    }

    const tokens = this.#createTokens(storedToken.user);
    const rotated = await this.repository.rotateRefreshToken({
      currentId: storedToken.id,
      userId: storedToken.userId,
      tokenHash: hashToken(tokens.refreshToken),
      expiresAt: getTokenExpiry(verifyRefreshToken(tokens.refreshToken)),
    });

    if (!rotated) throw new UnauthorizedError("Refresh token was already used");
    return tokens;
  }

  async logout(refreshToken) {
    await this.repository.revokeRefreshToken(hashToken(refreshToken));
  }

  async #issueTokens(user) {
    const tokens = this.#createTokens(user);
    const payload = verifyRefreshToken(tokens.refreshToken);

    await this.repository.createRefreshToken({
      userId: user.id,
      tokenHash: hashToken(tokens.refreshToken),
      expiresAt: getTokenExpiry(payload),
    });

    return tokens;
  }

  #createTokens(user) {
    const claims = {
      sub: user.id,
      email: user.email,
      role: user.role.name,
    };

    return {
      accessToken: signAccessToken(claims),
      refreshToken: signRefreshToken({ ...claims, jti: createTokenId() }),
    };
  }
}
