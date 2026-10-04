import { AppError } from "./app.error.js";

export class ValidationError extends AppError {
  constructor(message = "Validation failed", details) {
    super(message, 400, details);
  }
}
