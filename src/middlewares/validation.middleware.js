import { ValidationError } from "../errors/validation.error.js";

export const validate = (schemas = {}) => (request, _response, next) => {
  const targets = ["body", "params", "query"];
  const errors = [];

  for (const target of targets) {
    if (!schemas[target]) continue;

    const result = schemas[target].safeParse(request[target]);
    if (!result.success) {
      errors.push(...result.error.issues.map((issue) => ({ target, ...issue })));
      continue;
    }

    if (target === "query") {
      Object.defineProperty(request, "query", {
        value: result.data,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    } else {
      request[target] = result.data;
    }
  }

  return errors.length > 0
    ? next(new ValidationError("Request validation failed", errors))
    : next();
};
