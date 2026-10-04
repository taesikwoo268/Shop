import { ForbiddenError } from "../errors/forbidden.error.js";

export const authorize = (...allowedRoles) => (request, _response, next) => {
  if (!request.user || !allowedRoles.includes(request.user.role)) {
    return next(new ForbiddenError());
  }

  return next();
};
