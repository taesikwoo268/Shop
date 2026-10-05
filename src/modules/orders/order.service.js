import { ConflictError } from "../../errors/conflict.error.js";
import { NotFoundError } from "../../errors/not-found.error.js";
import { getPagination, getPaginationMeta } from "../../utils/pagination.js";

const transitions = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

export class OrderService {
  constructor(repository) {
    this.repository = repository;
  }

  create(userId, input) {
    return this.repository.createFromCart({ userId, ...input });
  }

  async listForUser(userId, query) {
    const pagination = getPagination(query);
    const result = await this.repository.listForUser({
      userId,
      status: query.status,
      skip: pagination.skip,
      take: pagination.take,
    });
    return { ...result, pagination: getPaginationMeta({ ...pagination, total: result.total }) };
  }

  async getForUser(userId, id) {
    const order = await this.repository.findForUser(userId, id);
    if (!order) throw new NotFoundError("Order not found");
    return order;
  }

  async cancelForUser(userId, id) {
    return this.repository.cancel(id, userId);
  }

  async listForAdmin(query) {
    const pagination = getPagination(query);
    const result = await this.repository.listForAdmin({
      status: query.status,
      skip: pagination.skip,
      take: pagination.take,
    });
    return { ...result, pagination: getPaginationMeta({ ...pagination, total: result.total }) };
  }

  async getForAdmin(id) {
    const order = await this.repository.findById(id);
    if (!order) throw new NotFoundError("Order not found");
    return order;
  }

  async updateStatus(id, status) {
    const order = await this.repository.findById(id);
    if (!order) throw new NotFoundError("Order not found");
    if (order.status === status) return order;
    if (!transitions[order.status]?.includes(status)) {
      throw new ConflictError(`Cannot change order from ${order.status} to ${status}`);
    }
    if (status === "CANCELLED") return this.repository.cancel(id);
    return this.repository.updateStatus(id, status);
  }
}
