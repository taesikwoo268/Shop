import { ConflictError } from "../../errors/conflict.error.js";
import { NotFoundError } from "../../errors/not-found.error.js";
import { ValidationError } from "../../errors/validation.error.js";
import { slugify } from "../../utils/slug.js";

export class CategoryService {
  constructor(repository) {
    this.repository = repository;
  }

  async listPublic() {
    const categories = await this.repository.listPublic();
    const nodes = new Map(
      categories.map((category) => [category.id, { ...category, children: [] }]),
    );
    const roots = [];

    for (const category of categories) {
      const node = nodes.get(category.id);
      if (!category.parentId) {
        roots.push(node);
      } else if (nodes.has(category.parentId)) {
        nodes.get(category.parentId).children.push(node);
      }
    }

    return roots;
  }

  async getPublicBySlug(slug) {
    const category = await this.repository.findPublicBySlug(slug);
    if (!category) throw new NotFoundError("Category not found");
    return category;
  }

  listAdmin() {
    return this.repository.listAll();
  }

  async create(data) {
    const slug = data.slug ?? slugify(data.name);
    if (!slug) throw new ValidationError("Unable to generate a valid slug");

    await this.#assertSlugAvailable(slug);
    if (data.parentId) await this.#requireCategory(data.parentId, "Parent category");

    try {
      return await this.repository.create({ ...data, slug });
    } catch (error) {
      if (error.code === "P2002") throw new ConflictError("Category slug already exists");
      throw error;
    }
  }

  async update(id, data) {
    await this.#requireCategory(id);

    if (data.slug) await this.#assertSlugAvailable(data.slug, id);
    if (data.parentId !== undefined) {
      await this.#assertValidParent(id, data.parentId);
    }

    try {
      return await this.repository.update(id, data);
    } catch (error) {
      if (error.code === "P2002") throw new ConflictError("Category slug already exists");
      throw error;
    }
  }

  async delete(id) {
    await this.#requireCategory(id);
    if ((await this.repository.countChildren(id)) > 0) {
      throw new ConflictError("Cannot delete a category that has child categories");
    }
    if ((await this.repository.countProducts(id)) > 0) {
      throw new ConflictError("Cannot delete a category that has products");
    }
    await this.repository.delete(id);
  }

  async #requireCategory(id, label = "Category") {
    const category = await this.repository.findById(id);
    if (!category) throw new NotFoundError(`${label} not found`);
    return category;
  }

  async #assertSlugAvailable(slug, excludedId) {
    const existing = await this.repository.findBySlug(slug);
    if (existing && existing.id !== excludedId) {
      throw new ConflictError("Category slug already exists");
    }
  }

  async #assertValidParent(categoryId, parentId) {
    if (parentId === null) return;
    if (parentId === categoryId) {
      throw new ValidationError("A category cannot be its own parent");
    }

    let current = await this.#requireCategory(parentId, "Parent category");
    const visited = new Set();

    while (current) {
      if (current.id === categoryId) {
        throw new ValidationError("Category hierarchy cannot contain a cycle");
      }
      if (!current.parentId || visited.has(current.id)) break;
      visited.add(current.id);
      current = await this.repository.findById(current.parentId);
    }
  }
}
