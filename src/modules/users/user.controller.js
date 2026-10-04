import { sendSuccess } from "../../utils/api-response.js";

export class UserController {
  constructor(service) {
    this.service = service;
  }

  getMe = async (request, response) => {
    const data = await this.service.getProfile(request.user.id);
    return sendSuccess(response, { message: "Profile retrieved", data });
  };

  updateMe = async (request, response) => {
    const data = await this.service.updateProfile(request.user.id, request.body);
    return sendSuccess(response, { message: "Profile updated", data });
  };

  changePassword = async (request, response) => {
    await this.service.changePassword(request.user.id, request.body);
    return sendSuccess(response, {
      message: "Password changed. Please log in again",
    });
  };

  listAddresses = async (request, response) => {
    const data = await this.service.listAddresses(request.user.id);
    return sendSuccess(response, { message: "Addresses retrieved", data });
  };

  createAddress = async (request, response) => {
    const data = await this.service.createAddress(request.user.id, request.body);
    return sendSuccess(response, {
      statusCode: 201,
      message: "Address created",
      data,
    });
  };

  updateAddress = async (request, response) => {
    const data = await this.service.updateAddress(
      request.user.id,
      request.params.id,
      request.body,
    );
    return sendSuccess(response, { message: "Address updated", data });
  };

  deleteAddress = async (request, response) => {
    await this.service.deleteAddress(request.user.id, request.params.id);
    return sendSuccess(response, { message: "Address deleted" });
  };

  setDefaultAddress = async (request, response) => {
    const data = await this.service.setDefaultAddress(
      request.user.id,
      request.params.id,
    );
    return sendSuccess(response, { message: "Default address updated", data });
  };
}
