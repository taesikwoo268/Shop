import { prisma } from "../../database/prisma.js";

export class PaymentRepository {
  constructor(database = prisma) {
    this.database = database;
  }
}
