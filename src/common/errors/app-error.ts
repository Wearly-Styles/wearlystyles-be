import { ErrorCode } from "../enums/error-code.enum"

export class AppError extends Error {
  public readonly statusCode: number
  public readonly code: ErrorCode

  constructor(message: string, statusCode = 500, code: ErrorCode = ErrorCode.INTERNAL_SERVER_ERROR) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    Object.setPrototypeOf(this, AppError.prototype)
  }
}
