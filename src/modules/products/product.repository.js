import { prisma } from "../../database/prisma.js";

export class ProductRepository {
  constructor(database = prisma) {
    this.database = database;
  }

  async listPublic({ where, orderBy, skip, take }) {
    const [items, total] = await this.database.$transaction([
      this.database.product.findMany({
        where,
        orderBy,
        skip,
        take,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }] },
          variants: {
            where: { isActive: true },
            orderBy: { price: "asc" },
            include: { inventory: true },
          },
        },
      }),
      this.database.product.count({ where }),
    ]);
    return { items, total };
  }

  findPublicBySlug(slug) {
    return this.database.product.findFirst({
      where: { slug, isActive: true, category: { isActive: true } },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }] },
        variants: {
          where: { isActive: true },
          orderBy: { price: "asc" },
          include: { inventory: true },
        },
      },
    });
  }

  async listAdmin({ where, skip, take }) {
    const [items, total] = await this.database.$transaction([
      this.database.product.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          _count: { select: { images: true, variants: true } },
        },
      }),
      this.database.product.count({ where }),
    ]);
    return { items, total };
  }

  findById(id) {
    return this.database.product.findUnique({ where: { id } });
  }

  findAdminById(id) {
    return this.database.product.findUnique({
      where: { id },
      include: {
        category: true,
        images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }] },
        variants: {
          orderBy: { createdAt: "asc" },
          include: { inventory: true },
        },
      },
    });
  }

  findBySlug(slug) {
    return this.database.product.findUnique({ where: { slug } });
  }

  findCategory(id) {
    return this.database.category.findUnique({ where: { id } });
  }

  create({ variants, images = [], ...product }) {
    return this.database.product.create({
      data: {
        ...product,
        variants: {
          create: variants.map(({ quantity, ...variant }) => ({
            ...variant,
            inventory: { create: { quantity } },
          })),
        },
        images: { create: images },
      },
      include: {
        category: true,
        images: true,
        variants: { include: { inventory: true } },
      },
    });
  }

  update(id, data) {
    return this.database.product.update({ where: { id }, data });
  }

  archive(id) {
    return this.database.product.update({
      where: { id },
      data: { isActive: false },
    });
  }

  countImages(productId) {
    return this.database.productImage.count({ where: { productId } });
  }

  createImage(productId, data, makePrimary) {
    return this.database.$transaction(async (transaction) => {
      if (makePrimary) {
        await transaction.productImage.updateMany({
          where: { productId, isPrimary: true },
          data: { isPrimary: false },
        });
      }
      return transaction.productImage.create({
        data: { ...data, productId, isPrimary: makePrimary },
      });
    });
  }

  findImage(productId, imageId) {
    return this.database.productImage.findFirst({
      where: { id: imageId, productId },
    });
  }

  updateImage(productId, imageId, data) {
    return this.database.$transaction(async (transaction) => {
      if (data.isPrimary === true) {
        await transaction.productImage.updateMany({
          where: { productId, isPrimary: true, id: { not: imageId } },
          data: { isPrimary: false },
        });
      }
      return transaction.productImage.update({ where: { id: imageId }, data });
    });
  }

  deleteImage(productId, imageId, wasPrimary) {
    return this.database.$transaction(async (transaction) => {
      await transaction.productImage.delete({ where: { id: imageId } });
      if (wasPrimary) {
        const replacement = await transaction.productImage.findFirst({
          where: { productId },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        });
        if (replacement) {
          await transaction.productImage.update({
            where: { id: replacement.id },
            data: { isPrimary: true },
          });
        }
      }
    });
  }

  findVariant(productId, variantId) {
    return this.database.productVariant.findFirst({
      where: { id: variantId, productId },
      include: { inventory: true },
    });
  }

  findVariantBySku(sku) {
    return this.database.productVariant.findUnique({ where: { sku } });
  }

  async countActiveVariants(productId) {
    return this.database.productVariant.count({
      where: { productId, isActive: true },
    });
  }

  createVariant(productId, { quantity, ...data }) {
    return this.database.$transaction(async (transaction) => {
      const variant = await transaction.productVariant.create({
        data: {
          ...data,
          productId,
          inventory: { create: { quantity } },
        },
        include: { inventory: true },
      });
      await this.#syncPriceRange(transaction, productId);
      return variant;
    });
  }

  updateVariant(productId, variantId, data) {
    return this.database.$transaction(async (transaction) => {
      const variant = await transaction.productVariant.update({
        where: { id: variantId },
        data,
        include: { inventory: true },
      });
      await this.#syncPriceRange(transaction, productId);
      return variant;
    });
  }

  archiveVariant(productId, variantId) {
    return this.database.$transaction(async (transaction) => {
      const variant = await transaction.productVariant.update({
        where: { id: variantId },
        data: { isActive: false },
        include: { inventory: true },
      });
      await this.#syncPriceRange(transaction, productId);
      return variant;
    });
  }

  async setInventory(variantId, quantity) {
    return this.database.$transaction(async (transaction) => {
      const updated = await transaction.inventory.updateMany({
        where: { variantId, reservedQuantity: { lte: quantity } },
        data: { quantity },
      });
      if (updated.count !== 1) return null;
      return transaction.inventory.findUnique({ where: { variantId } });
    });
  }

  async #syncPriceRange(transaction, productId) {
    const range = await transaction.productVariant.aggregate({
      where: { productId, isActive: true },
      _min: { price: true },
      _max: { price: true },
    });
    if (range._min.price && range._max.price) {
      await transaction.product.update({
        where: { id: productId },
        data: { minPrice: range._min.price, maxPrice: range._max.price },
      });
    }
  }
}
