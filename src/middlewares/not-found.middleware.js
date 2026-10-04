import { NotFoundError } from "../errors/not-found.error.js";

export const notFoundHandler = (request, _response, next) => {
  next(new NotFoundError(`Route ${request.method} ${request.originalUrl} not found`));
};
