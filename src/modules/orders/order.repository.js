import { prisma } from "../../database/prisma.js";
import { ConflictError } from "../../errors/conflict.error.js";
import { NotFoundError } from "../../errors/not-found.error.js";
import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";

const orderInclude = {
  items: {
    orderBy: { createdAt: "asc" },
    include: { variant: { select: { id: true, name: true, sku: true } } },
  },
};

export class OrderRepository {
  constructor(database = prisma) {
    this.database = database;
  }

  async createFromCart({ userId, addressId, note }) {
    return this.database.$transaction(async (transaction) => {
      const [address, cart] = await Promise.all([
        transaction.address.findFirst({ where: { id: addressId, userId } }),
        transaction.cart.findUnique({
          where: { userId },
          include: {
            items: {
              orderBy: { createdAt: "asc" },
              include: {
                variant: {
                  include: { inventory: true, product: { include: { category: true } } },
                },
              },
            },
          },
        }),
      ]);

      if (!address) throw new NotFoundError("Shipping address not found");
      if (!cart || cart.items.length === 0) throw new ConflictError("Cart is empty");

      let subtotal = new Prisma.Decimal(0);
      const orderItems = [];

      for (const item of cart.items) {
        const variant = item.variant;
        if (!variant.isActive || !variant.product.isActive || !variant.product.category.isActive) {
          throw new ConflictError("Cart contains an unavailable product");
        }
        if (!variant.inventory) throw new ConflictError("Product inventory is unavailable");

        const inventory = await transaction.inventory.findUnique({
          where: { variantId: variant.id },
        });
        if (!inventory || inventory.quantity - inventory.reservedQuantity < item.quantity) {
          throw new ConflictError(`Insufficient stock for SKU ${variant.sku}`);
        }

        const reserved = await transaction.inventory.updateMany({
          where: { id: inventory.id, reservedQuantity: inventory.reservedQuantity },
          data: { reservedQuantity: { increment: item.quantity } },
        });
        if (reserved.count !== 1) {
          throw new ConflictError(`Inventory changed for SKU ${variant.sku}; please retry`);
        }

        const itemSubtotal = variant.price.mul(item.quantity);
        subtotal = subtotal.add(itemSubtotal);
        orderItems.push({
          variantId: variant.id,
          productName: variant.product.name,
          variantName: variant.name,
          sku: variant.sku,
          unitPrice: variant.price,
          quantity: item.quantity,
          subtotal: itemSubtotal,
        });
      }

      const shippingFee = new Prisma.Decimal(0);
      const order = await transaction.order.create({
        data: {
          orderNumber: `ORD-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`,
          userId,
          subtotal,
          shippingFee,
          total: subtotal.add(shippingFee),
          recipientName: address.recipientName,
          phone: address.phone,
          addressLine: address.addressLine,
          ward: address.ward,
          district: address.district,
          province: address.province,
          postalCode: address.postalCode,
          note,
          items: { create: orderItems },
        },
        include: orderInclude,
      });

      await transaction.cartItem.deleteMany({ where: { cartId: cart.id } });
      await transaction.cart.update({ where: { id: cart.id }, data: { updatedAt: new Date() } });
      return order;
    });
  }

  async listForUser({ userId, status, skip, take }) {
    const where = { userId, ...(status ? { status } : {}) };
    const [items, total] = await this.database.$transaction([
      this.database.order.findMany({ where, orderBy: { createdAt: "desc" }, skip, take, include: orderInclude }),
      this.database.order.count({ where }),
    ]);
    return { items, total };
  }

  findForUser(userId, id) {
    return this.database.order.findFirst({ where: { id, userId }, include: orderInclude });
  }

  async listForAdmin({ status, skip, take }) {
    const where = status ? { status } : {};
    const [items, total] = await this.database.$transaction([
      this.database.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        include: { ...orderInclude, user: { select: { id: true, email: true, firstName: true, lastName: true } } },
      }),
      this.database.order.count({ where }),
    ]);
    return { items, total };
  }

  findById(id) {
    return this.database.order.findUnique({ where: { id }, include: orderInclude });
  }

  cancel(id, userId) {
    return this.database.$transaction(async (transaction) => {
      const order = await transaction.order.findFirst({
        where: { id, ...(userId ? { userId } : {}) },
        include: { items: true },
      });
      if (!order) throw new NotFoundError("Order not found");
      if (!["PENDING", "CONFIRMED"].includes(order.status)) {
        throw new ConflictError("Order cannot be cancelled in its current status");
      }

      for (const item of order.items) {
        if (!item.variantId) continue;
        const released = await transaction.inventory.updateMany({
          where: { variantId: item.variantId, reservedQuantity: { gte: item.quantity } },
          data: { reservedQuantity: { decrement: item.quantity } },
        });
        if (released.count !== 1) throw new ConflictError("Unable to release reserved inventory");
      }

      return transaction.order.update({
        where: { id },
        data: { status: "CANCELLED" },
        include: orderInclude,
      });
    });
  }

  updateStatus(id, status) {
    return this.database.order.update({ where: { id }, data: { status }, include: orderInclude });
  }
}
