import { prisma } from "../../database/prisma.js";

const cartInclude = {
  items: {
    orderBy: { createdAt: "desc" },
    include: {
      variant: {
        include: {
          inventory: true,
          product: {
            include: {
              category: { select: { id: true, name: true, slug: true, isActive: true } },
              images: {
                where: { isPrimary: true },
                orderBy: { sortOrder: "asc" },
                take: 1,
              },
            },
          },
        },
      },
    },
  },
};

export class CartRepository {
  constructor(database = prisma) {
    this.database = database;
  }

  getOrCreate(userId) {
    return this.database.cart.upsert({
      where: { userId },
      update: {},
      create: { userId },
      include: cartInclude,
    });
  }

  findVariant(variantId) {
    return this.database.productVariant.findUnique({
      where: { id: variantId },
      include: {
        inventory: true,
        product: { include: { category: true } },
      },
    });
  }

  findItemForUser(userId, itemId) {
    return this.database.cartItem.findFirst({
      where: { id: itemId, cart: { userId } },
      include: {
        cart: true,
        variant: { include: { inventory: true, product: { include: { category: true } } } },
      },
    });
  }

  setItemQuantity(cartId, variantId, quantity) {
    return this.database.$transaction(async (transaction) => {
      await transaction.cartItem.upsert({
        where: { cartId_variantId: { cartId, variantId } },
        update: { quantity },
        create: { cartId, variantId, quantity },
      });
      await transaction.cart.update({ where: { id: cartId }, data: { updatedAt: new Date() } });
      return transaction.cart.findUnique({ where: { id: cartId }, include: cartInclude });
    });
  }

  updateItemQuantity(cartId, itemId, quantity) {
    return this.database.$transaction(async (transaction) => {
      await transaction.cartItem.update({ where: { id: itemId }, data: { quantity } });
      await transaction.cart.update({ where: { id: cartId }, data: { updatedAt: new Date() } });
      return transaction.cart.findUnique({ where: { id: cartId }, include: cartInclude });
    });
  }

  deleteItem(cartId, itemId) {
    return this.database.$transaction(async (transaction) => {
      await transaction.cartItem.delete({ where: { id: itemId } });
      await transaction.cart.update({ where: { id: cartId }, data: { updatedAt: new Date() } });
      return transaction.cart.findUnique({ where: { id: cartId }, include: cartInclude });
    });
  }

  clear(cartId) {
    return this.database.$transaction(async (transaction) => {
      await transaction.cartItem.deleteMany({ where: { cartId } });
      await transaction.cart.update({ where: { id: cartId }, data: { updatedAt: new Date() } });
      return transaction.cart.findUnique({ where: { id: cartId }, include: cartInclude });
    });
  }
}
