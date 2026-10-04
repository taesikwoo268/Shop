import { sendSuccess } from "../../utils/api-response.js";

export class AuthController {
  constructor(service) {
    this.service = service;
  }

  register = async (request, response) => {
    const data = await this.service.register(request.body);
    return sendSuccess(response, {
      statusCode: 201,
      message: "Registration successful",
      data,
    });
  };

  login = async (request, response) => {
    const data = await this.service.login(request.body);
    return sendSuccess(response, { message: "Login successful", data });
  };

  refresh = async (request, response) => {
    const data = await this.service.refresh(request.body.refreshToken);
    return sendSuccess(response, { message: "Token refreshed", data });
  };

  logout = async (request, response) => {
    await this.service.logout(request.body.refreshToken);
    return sendSuccess(response, { message: "Logout successful" });
  };
}
