import { prisma } from "../../database/prisma.js";

export class OrderRepository {
  constructor(database = prisma) {
    this.database = database;
  }
}
