import { prisma } from "../../database/prisma.js";

export class PromotionRepository {
  constructor(database = prisma) {
    this.database = database;
  }
}
