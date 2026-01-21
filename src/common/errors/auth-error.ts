import { AppError } from "./app-error"
import { ErrorCode } from "../enums/error-code.enum"

export class AuthError extends AppError {
  constructor(message: string) {
    super(message, 401, ErrorCode.UNAUTHORIZED)
    Object.setPrototypeOf(this, AuthError.prototype)
  }
}
