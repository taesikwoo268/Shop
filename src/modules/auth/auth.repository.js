import { prisma } from "../../database/prisma.js";

export class AuthRepository {
  constructor(database = prisma) {
    this.database = database;
  }

  findUserByEmail(email) {
    return this.database.user.findUnique({
      where: { email },
      include: { role: true },
    });
  }

  createCustomer({ email, passwordHash, firstName, lastName }) {
    return this.database.$transaction(async (transaction) => {
      const role = await transaction.role.upsert({
        where: { name: "CUSTOMER" },
        update: {},
        create: { name: "CUSTOMER" },
      });

      return transaction.user.create({
        data: { email, passwordHash, firstName, lastName, roleId: role.id },
        include: { role: true },
      });
    });
  }

  createRefreshToken({ userId, tokenHash, expiresAt }) {
    return this.database.refreshToken.create({
      data: { userId, tokenHash, expiresAt },
    });
  }

  findActiveRefreshToken(tokenHash) {
    return this.database.refreshToken.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
        user: { status: "ACTIVE" },
      },
      include: { user: { include: { role: true } } },
    });
  }

  rotateRefreshToken({ currentId, userId, tokenHash, expiresAt }) {
    return this.database.$transaction(async (transaction) => {
      const revoked = await transaction.refreshToken.updateMany({
        where: { id: currentId, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      if (revoked.count !== 1) return null;

      return transaction.refreshToken.create({
        data: { userId, tokenHash, expiresAt },
      });
    });
  }

  revokeRefreshToken(tokenHash) {
    return this.database.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
