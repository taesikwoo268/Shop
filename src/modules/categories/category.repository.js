import { prisma } from "../../database/prisma.js";

export class CategoryRepository {
  constructor(database = prisma) {
    this.database = database;
  }

  listPublic() {
    return this.database.category.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  }

  listAll() {
    return this.database.category.findMany({
      include: { _count: { select: { children: true } } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  }

  findPublicBySlug(slug) {
    return this.database.category.findFirst({
      where: { slug, isActive: true },
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        children: {
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        },
      },
    });
  }

  findById(id) {
    return this.database.category.findUnique({ where: { id } });
  }

  findBySlug(slug) {
    return this.database.category.findUnique({ where: { slug } });
  }

  create(data) {
    return this.database.category.create({ data });
  }

  update(id, data) {
    return this.database.category.update({ where: { id }, data });
  }

  countChildren(id) {
    return this.database.category.count({ where: { parentId: id } });
  }

  countProducts(id) {
    return this.database.product.count({ where: { categoryId: id } });
  }

  delete(id) {
    return this.database.category.delete({ where: { id } });
  }
}
