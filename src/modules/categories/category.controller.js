import { sendSuccess } from "../../utils/api-response.js";

export class CategoryController {
  constructor(service) {
    this.service = service;
  }

  listPublic = async (_request, response) => {
    const data = await this.service.listPublic();
    return sendSuccess(response, { message: "Categories retrieved", data });
  };

  getPublicBySlug = async (request, response) => {
    const data = await this.service.getPublicBySlug(request.params.slug);
    return sendSuccess(response, { message: "Category retrieved", data });
  };

  listAdmin = async (_request, response) => {
    const data = await this.service.listAdmin();
    return sendSuccess(response, { message: "Categories retrieved", data });
  };

  create = async (request, response) => {
    const data = await this.service.create(request.body);
    return sendSuccess(response, {
      statusCode: 201,
      message: "Category created",
      data,
    });
  };

  update = async (request, response) => {
    const data = await this.service.update(request.params.id, request.body);
    return sendSuccess(response, { message: "Category updated", data });
  };

  delete = async (request, response) => {
    await this.service.delete(request.params.id);
    return sendSuccess(response, { message: "Category deleted" });
  };
}
