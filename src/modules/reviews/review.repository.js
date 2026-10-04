import { prisma } from "../../database/prisma.js";

export class ReviewRepository {
  constructor(database = prisma) {
    this.database = database;
  }
}
