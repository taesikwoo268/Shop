import { UnauthorizedError } from "../errors/unauthorized.error.js";
import { verifyAccessToken } from "../utils/jwt.js";

export const authenticate = (request, _response, next) => {
  const authorization = request.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    return next(new UnauthorizedError("Missing or invalid bearer token"));
  }

  try {
    const payload = verifyAccessToken(authorization.slice(7));
    request.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
    return next();
  } catch {
    return next(new UnauthorizedError("Invalid or expired access token"));
  }
};
