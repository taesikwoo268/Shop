import { ConflictError } from "../../errors/conflict.error.js";
import { NotFoundError } from "../../errors/not-found.error.js";
import { ValidationError } from "../../errors/validation.error.js";
import { getPagination, getPaginationMeta } from "../../utils/pagination.js";
import { slugify } from "../../utils/slug.js";

const withAvailability = (product) => ({
  ...product,
  variants: product.variants?.map((variant) => ({
    ...variant,
    inventory: variant.inventory
      ? {
          ...variant.inventory,
          availableQuantity:
            variant.inventory.quantity - variant.inventory.reservedQuantity,
        }
      : null,
  })),
});

export class ProductService {
  constructor(repository) {
    this.repository = repository;
  }

  async listPublic(query) {
    const pagination = getPagination(query);
    const variantFilter = { isActive: true };
    if (query.minPrice != null || query.maxPrice != null) {
      variantFilter.price = {
        ...(query.minPrice != null ? { gte: query.minPrice } : {}),
        ...(query.maxPrice != null ? { lte: query.maxPrice } : {}),
      };
    }

    const where = {
      isActive: true,
      category: {
        is: {
          isActive: true,
          ...(query.category ? { slug: query.category } : {}),
        },
      },
      variants: { some: variantFilter },
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search } },
              { brand: { contains: query.search } },
              { description: { contains: query.search } },
            ],
          }
        : {}),
    };

    const orderBy = {
      newest: { createdAt: "desc" },
      price_asc: { minPrice: "asc" },
      price_desc: { minPrice: "desc" },
      name_asc: { name: "asc" },
    }[query.sort];

    const result = await this.repository.listPublic({
      where,
      orderBy,
      skip: pagination.skip,
      take: pagination.take,
    });

    return {
      items: result.items.map(withAvailability),
      pagination: getPaginationMeta({ ...pagination, total: result.total }),
    };
  }

  async getPublicBySlug(slug) {
    const product = await this.repository.findPublicBySlug(slug);
    if (!product || product.variants.length === 0) {
      throw new NotFoundError("Product not found");
    }
    return withAvailability(product);
  }

  async listAdmin(query) {
    const pagination = getPagination(query);
    const where = query.search
      ? {
          OR: [
            { name: { contains: query.search } },
            { slug: { contains: query.search } },
            { brand: { contains: query.search } },
          ],
        }
      : {};
    const result = await this.repository.listAdmin({
      where,
      skip: pagination.skip,
      take: pagination.take,
    });
    return {
      items: result.items,
      pagination: getPaginationMeta({ ...pagination, total: result.total }),
    };
  }

  async getAdminById(id) {
    const product = await this.repository.findAdminById(id);
    if (!product) throw new NotFoundError("Product not found");
    return withAvailability(product);
  }

  async create(input) {
    const category = await this.repository.findCategory(input.categoryId);
    if (!category) throw new NotFoundError("Category not found");
    if (!category.isActive) throw new ValidationError("Category is not active");

    const slug = input.slug ?? slugify(input.name);
    if (!slug) throw new ValidationError("Unable to generate a valid slug");
    await this.#assertSlugAvailable(slug);
    await this.#assertUniqueSkus(input.variants);

    const prices = input.variants.map((variant) => Number(variant.price));
    const images = this.#normalizeImages(input.images ?? []);

    try {
      return withAvailability(
        await this.repository.create({
          ...input,
          slug,
          images,
          minPrice: Math.min(...prices).toFixed(2),
          maxPrice: Math.max(...prices).toFixed(2),
        }),
      );
    } catch (error) {
      this.#throwKnownConflict(error);
      throw error;
    }
  }

  async update(id, data) {
    await this.#requireProduct(id);
    if (data.categoryId) {
      const category = await this.repository.findCategory(data.categoryId);
      if (!category) throw new NotFoundError("Category not found");
      if (!category.isActive) throw new ValidationError("Category is not active");
    }
    if (data.slug) await this.#assertSlugAvailable(data.slug, id);

    try {
      return await this.repository.update(id, data);
    } catch (error) {
      this.#throwKnownConflict(error);
      throw error;
    }
  }

  async archive(id) {
    await this.#requireProduct(id);
    await this.repository.archive(id);
  }

  async createImage(productId, data) {
    await this.#requireProduct(productId);
    const count = await this.repository.countImages(productId);
    return this.repository.createImage(productId, data, data.isPrimary === true || count === 0);
  }

  async updateImage(productId, imageId, data) {
    await this.#requireProduct(productId);
    const image = await this.repository.findImage(productId, imageId);
    if (!image) throw new NotFoundError("Product image not found");
    if (image.isPrimary && data.isPrimary === false) {
      throw new ValidationError("Set another image as primary instead");
    }
    return this.repository.updateImage(productId, imageId, data);
  }

  async deleteImage(productId, imageId) {
    await this.#requireProduct(productId);
    const image = await this.repository.findImage(productId, imageId);
    if (!image) throw new NotFoundError("Product image not found");
    await this.repository.deleteImage(productId, imageId, image.isPrimary);
  }

  async createVariant(productId, data) {
    await this.#requireProduct(productId);
    await this.#assertSkuAvailable(data.sku);
    try {
      return await this.repository.createVariant(productId, data);
    } catch (error) {
      this.#throwKnownConflict(error);
      throw error;
    }
  }

  async updateVariant(productId, variantId, data) {
    await this.#requireProduct(productId);
    const variant = await this.repository.findVariant(productId, variantId);
    if (!variant) throw new NotFoundError("Product variant not found");

    if (data.sku) await this.#assertSkuAvailable(data.sku, variantId);
    const finalPrice = data.price ?? variant.price;
    const finalCompareAtPrice =
      data.compareAtPrice === undefined ? variant.compareAtPrice : data.compareAtPrice;
    if (finalCompareAtPrice != null && Number(finalCompareAtPrice) < Number(finalPrice)) {
      throw new ValidationError("Compare-at price must be greater than or equal to price");
    }
    if (data.isActive === false && variant.isActive) {
      await this.#assertNotLastActiveVariant(productId);
    }

    try {
      return await this.repository.updateVariant(productId, variantId, data);
    } catch (error) {
      this.#throwKnownConflict(error);
      throw error;
    }
  }

  async archiveVariant(productId, variantId) {
    await this.#requireProduct(productId);
    const variant = await this.repository.findVariant(productId, variantId);
    if (!variant) throw new NotFoundError("Product variant not found");
    if (variant.isActive) await this.#assertNotLastActiveVariant(productId);
    return this.repository.archiveVariant(productId, variantId);
  }

  async setInventory(productId, variantId, quantity) {
    await this.#requireProduct(productId);
    const variant = await this.repository.findVariant(productId, variantId);
    if (!variant) throw new NotFoundError("Product variant not found");
    const inventory = await this.repository.setInventory(variantId, quantity);
    if (!inventory) {
      throw new ConflictError("Quantity cannot be lower than reserved quantity");
    }
    return {
      ...inventory,
      availableQuantity: inventory.quantity - inventory.reservedQuantity,
    };
  }

  async #requireProduct(id) {
    const product = await this.repository.findById(id);
    if (!product) throw new NotFoundError("Product not found");
    return product;
  }

  async #assertSlugAvailable(slug, excludedId) {
    const product = await this.repository.findBySlug(slug);
    if (product && product.id !== excludedId) {
      throw new ConflictError("Product slug already exists");
    }
  }

  async #assertUniqueSkus(variants) {
    const skus = variants.map((variant) => variant.sku);
    if (new Set(skus).size !== skus.length) {
      throw new ConflictError("Variant SKUs must be unique");
    }
    for (const sku of skus) await this.#assertSkuAvailable(sku);
  }

  async #assertSkuAvailable(sku, excludedId) {
    const variant = await this.repository.findVariantBySku(sku);
    if (variant && variant.id !== excludedId) {
      throw new ConflictError("Variant SKU already exists");
    }
  }

  async #assertNotLastActiveVariant(productId) {
    if ((await this.repository.countActiveVariants(productId)) <= 1) {
      throw new ConflictError("A product must have at least one active variant");
    }
  }

  #normalizeImages(images) {
    if (images.length === 0) return images;
    if (images.filter((image) => image.isPrimary).length > 1) {
      throw new ValidationError("Only one product image can be primary");
    }
    if (!images.some((image) => image.isPrimary)) {
      return images.map((image, index) => ({ ...image, isPrimary: index === 0 }));
    }
    return images;
  }

  #throwKnownConflict(error) {
    if (error.code === "P2002") {
      throw new ConflictError("Product slug or variant SKU already exists");
    }
  }
}
