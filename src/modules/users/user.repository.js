import { prisma } from "../../database/prisma.js";

export class UserRepository {
  constructor(database = prisma) {
    this.database = database;
  }

  findById(id) {
    return this.database.user.findUnique({
      where: { id },
      include: { role: true },
    });
  }

  updateProfile(userId, data) {
    return this.database.user.update({
      where: { id: userId },
      data,
      include: { role: true },
    });
  }

  changePassword(userId, passwordHash) {
    return this.database.$transaction([
      this.database.user.update({
        where: { id: userId },
        data: { passwordHash },
      }),
      this.database.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  listAddresses(userId) {
    return this.database.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
  }

  createAddress(userId, data) {
    return this.database.$transaction(async (transaction) => {
      const addressCount = await transaction.address.count({ where: { userId } });
      const isDefault = data.isDefault === true || addressCount === 0;

      if (isDefault) {
        await transaction.address.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }

      return transaction.address.create({
        data: { ...data, userId, isDefault },
      });
    });
  }

  updateAddress(userId, addressId, data) {
    return this.database.$transaction(async (transaction) => {
      const current = await transaction.address.findFirst({
        where: { id: addressId, userId },
      });
      if (!current) return null;

      if (data.isDefault === true) {
        await transaction.address.updateMany({
          where: { userId, isDefault: true, id: { not: addressId } },
          data: { isDefault: false },
        });
      }

      const updated = await transaction.address.update({
        where: { id: addressId },
        data,
      });

      if (current.isDefault && data.isDefault === false) {
        const replacement = await transaction.address.findFirst({
          where: { userId, id: { not: addressId } },
          orderBy: { createdAt: "asc" },
        });
        if (replacement) {
          await transaction.address.update({
            where: { id: replacement.id },
            data: { isDefault: true },
          });
        }
      }

      return updated;
    });
  }

  deleteAddress(userId, addressId) {
    return this.database.$transaction(async (transaction) => {
      const address = await transaction.address.findFirst({
        where: { id: addressId, userId },
      });
      if (!address) return null;

      await transaction.address.delete({ where: { id: addressId } });

      if (address.isDefault) {
        const replacement = await transaction.address.findFirst({
          where: { userId },
          orderBy: { createdAt: "asc" },
        });
        if (replacement) {
          await transaction.address.update({
            where: { id: replacement.id },
            data: { isDefault: true },
          });
        }
      }

      return address;
    });
  }

  setDefaultAddress(userId, addressId) {
    return this.database.$transaction(async (transaction) => {
      const address = await transaction.address.findFirst({
        where: { id: addressId, userId },
      });
      if (!address) return null;

      await transaction.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });

      return transaction.address.update({
        where: { id: addressId },
        data: { isDefault: true },
      });
    });
  }
}
