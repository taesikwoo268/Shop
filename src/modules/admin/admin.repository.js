import { prisma } from "../../database/prisma.js";

export class AdminRepository {
  constructor(database = prisma) {
    this.database = database;
  }
}
