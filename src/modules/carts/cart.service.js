import { ConflictError } from "../../errors/conflict.error.js";
import { NotFoundError } from "../../errors/not-found.error.js";
import { ValidationError } from "../../errors/validation.error.js";

const toMinorUnits = (value) => {
  const [whole, fraction = ""] = value.toString().split(".");
  return BigInt(whole) * 100n + BigInt(`${fraction}00`.slice(0, 2));
};

const formatMinorUnits = (value) => {
  const whole = value / 100n;
  const fraction = (value % 100n).toString().padStart(2, "0");
  return `${whole}.${fraction}`;
};

const getAvailableQuantity = (variant) =>
  variant.inventory
    ? variant.inventory.quantity - variant.inventory.reservedQuantity
    : 0;

export class CartService {
  constructor(repository) {
    this.repository = repository;
  }

  async getCart(userId) {
    return this.#serialize(await this.repository.getOrCreate(userId));
  }

  async addItem(userId, { variantId, quantity }) {
    const [cart, variant] = await Promise.all([
      this.repository.getOrCreate(userId),
      this.repository.findVariant(variantId),
    ]);
    this.#assertPurchasable(variant);

    const existing = cart.items.find((item) => item.variantId === variantId);
    const nextQuantity = (existing?.quantity ?? 0) + quantity;
    if (nextQuantity > 99) {
      throw new ValidationError("Cart item quantity cannot exceed 99");
    }
    this.#assertStock(variant, nextQuantity);

    const updated = await this.repository.setItemQuantity(
      cart.id,
      variantId,
      nextQuantity,
    );
    return this.#serialize(updated);
  }

  async updateItem(userId, itemId, quantity) {
    const item = await this.repository.findItemForUser(userId, itemId);
    if (!item) throw new NotFoundError("Cart item not found");
    this.#assertPurchasable(item.variant);
    this.#assertStock(item.variant, quantity);

    return this.#serialize(
      await this.repository.updateItemQuantity(item.cartId, itemId, quantity),
    );
  }

  async deleteItem(userId, itemId) {
    const item = await this.repository.findItemForUser(userId, itemId);
    if (!item) throw new NotFoundError("Cart item not found");
    return this.#serialize(await this.repository.deleteItem(item.cartId, itemId));
  }

  async clear(userId) {
    const cart = await this.repository.getOrCreate(userId);
    return this.#serialize(await this.repository.clear(cart.id));
  }

  #assertPurchasable(variant) {
    if (
      !variant ||
      !variant.isActive ||
      !variant.product.isActive ||
      !variant.product.category.isActive
    ) {
      throw new NotFoundError("Product variant is not available");
    }
  }

  #assertStock(variant, requestedQuantity) {
    const availableQuantity = getAvailableQuantity(variant);
    if (requestedQuantity > availableQuantity) {
      throw new ConflictError(
        `Only ${availableQuantity} item(s) are currently available`,
      );
    }
  }

  #serialize(cart) {
    let total = 0n;
    let totalQuantity = 0;

    const items = cart.items.map((item) => {
      const availableQuantity = getAvailableQuantity(item.variant);
      const subtotal = toMinorUnits(item.variant.price) * BigInt(item.quantity);
      total += subtotal;
      totalQuantity += item.quantity;

      return {
        id: item.id,
        quantity: item.quantity,
        unitPrice: item.variant.price,
        subtotal: formatMinorUnits(subtotal),
        isAvailable:
          item.variant.isActive &&
          item.variant.product.isActive &&
          item.variant.product.category.isActive &&
          availableQuantity >= item.quantity,
        variant: {
          id: item.variant.id,
          name: item.variant.name,
          sku: item.variant.sku,
          attributes: item.variant.attributes,
          price: item.variant.price,
          compareAtPrice: item.variant.compareAtPrice,
          availableQuantity,
        },
        product: {
          id: item.variant.product.id,
          name: item.variant.product.name,
          slug: item.variant.product.slug,
          brand: item.variant.product.brand,
          image: item.variant.product.images[0] ?? null,
          category: item.variant.product.category,
        },
      };
    });

    return {
      id: cart.id,
      items,
      summary: {
        itemCount: items.length,
        totalQuantity,
        total: formatMinorUnits(total),
      },
      updatedAt: cart.updatedAt,
    };
  }
}
