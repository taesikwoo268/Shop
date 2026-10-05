import { sendSuccess } from "../../utils/api-response.js";

export class OrderController {
  constructor(service) {
    this.service = service;
  }

  create = async (request, response) => {
    const data = await this.service.create(request.user.id, request.body);
    return sendSuccess(response, { statusCode: 201, message: "Order created", data });
  };

  list = async (request, response) => {
    const data = await this.service.listForUser(request.user.id, request.query);
    return sendSuccess(response, { message: "Orders retrieved", data });
  };

  get = async (request, response) => {
    const data = await this.service.getForUser(request.user.id, request.params.id);
    return sendSuccess(response, { message: "Order retrieved", data });
  };

  cancel = async (request, response) => {
    const data = await this.service.cancelForUser(request.user.id, request.params.id);
    return sendSuccess(response, { message: "Order cancelled", data });
  };

  listAdmin = async (request, response) => {
    const data = await this.service.listForAdmin(request.query);
    return sendSuccess(response, { message: "Orders retrieved", data });
  };

  getAdmin = async (request, response) => {
    const data = await this.service.getForAdmin(request.params.id);
    return sendSuccess(response, { message: "Order retrieved", data });
  };

  updateStatus = async (request, response) => {
    const data = await this.service.updateStatus(request.params.id, request.body.status);
    return sendSuccess(response, { message: "Order status updated", data });
  };
}
