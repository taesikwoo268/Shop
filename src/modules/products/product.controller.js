import { sendSuccess } from "../../utils/api-response.js";

export class ProductController {
  constructor(service) {
    this.service = service;
  }

  listPublic = async (request, response) => {
    const data = await this.service.listPublic(request.query);
    return sendSuccess(response, { message: "Products retrieved", data });
  };

  getPublicBySlug = async (request, response) => {
    const data = await this.service.getPublicBySlug(request.params.slug);
    return sendSuccess(response, { message: "Product retrieved", data });
  };

  listAdmin = async (request, response) => {
    const data = await this.service.listAdmin(request.query);
    return sendSuccess(response, { message: "Products retrieved", data });
  };

  getAdminById = async (request, response) => {
    const data = await this.service.getAdminById(request.params.id);
    return sendSuccess(response, { message: "Product retrieved", data });
  };

  create = async (request, response) => {
    const data = await this.service.create(request.body);
    return sendSuccess(response, {
      statusCode: 201,
      message: "Product created",
      data,
    });
  };

  update = async (request, response) => {
    const data = await this.service.update(request.params.id, request.body);
    return sendSuccess(response, { message: "Product updated", data });
  };

  archive = async (request, response) => {
    await this.service.archive(request.params.id);
    return sendSuccess(response, { message: "Product archived" });
  };

  createImage = async (request, response) => {
    const data = await this.service.createImage(request.params.id, request.body);
    return sendSuccess(response, {
      statusCode: 201,
      message: "Product image created",
      data,
    });
  };

  updateImage = async (request, response) => {
    const data = await this.service.updateImage(
      request.params.productId,
      request.params.childId,
      request.body,
    );
    return sendSuccess(response, { message: "Product image updated", data });
  };

  deleteImage = async (request, response) => {
    await this.service.deleteImage(request.params.productId, request.params.childId);
    return sendSuccess(response, { message: "Product image deleted" });
  };

  createVariant = async (request, response) => {
    const data = await this.service.createVariant(request.params.id, request.body);
    return sendSuccess(response, {
      statusCode: 201,
      message: "Product variant created",
      data,
    });
  };

  updateVariant = async (request, response) => {
    const data = await this.service.updateVariant(
      request.params.productId,
      request.params.childId,
      request.body,
    );
    return sendSuccess(response, { message: "Product variant updated", data });
  };

  archiveVariant = async (request, response) => {
    const data = await this.service.archiveVariant(
      request.params.productId,
      request.params.childId,
    );
    return sendSuccess(response, { message: "Product variant archived", data });
  };

  setInventory = async (request, response) => {
    const data = await this.service.setInventory(
      request.params.productId,
      request.params.childId,
      request.body.quantity,
    );
    return sendSuccess(response, { message: "Inventory updated", data });
  };
}
