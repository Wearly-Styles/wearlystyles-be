import { AppError } from "./app-error"
import { ErrorCode } from "../enums/error-code.enum"

export class ValidationError extends AppError {
  public details?: unknown

  constructor(message: string, details?: unknown) {
    super(message, 400, ErrorCode.VALIDATION_ERROR)
    this.details = details
    Object.setPrototypeOf(this, ValidationError.prototype)
  }
}
