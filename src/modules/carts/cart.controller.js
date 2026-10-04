import { sendSuccess } from "../../utils/api-response.js";

export class CartController {
  constructor(service) {
    this.service = service;
  }

  get = async (request, response) => {
    const data = await this.service.getCart(request.user.id);
    return sendSuccess(response, { message: "Cart retrieved", data });
  };

  addItem = async (request, response) => {
    const data = await this.service.addItem(request.user.id, request.body);
    return sendSuccess(response, {
      statusCode: 201,
      message: "Item added to cart",
      data,
    });
  };

  updateItem = async (request, response) => {
    const data = await this.service.updateItem(
      request.user.id,
      request.params.itemId,
      request.body.quantity,
    );
    return sendSuccess(response, { message: "Cart item updated", data });
  };

  deleteItem = async (request, response) => {
    const data = await this.service.deleteItem(request.user.id, request.params.itemId);
    return sendSuccess(response, { message: "Cart item deleted", data });
  };

  clear = async (request, response) => {
    const data = await this.service.clear(request.user.id);
    return sendSuccess(response, { message: "Cart cleared", data });
  };
}
