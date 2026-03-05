import type { Request, Response, NextFunction } from "express"
import { AppError } from "@common/errors/app-error"
import { ErrorResponse } from "@common/responses/error.response"
import logger from "@config/logger"
import { MESSAGES } from "@common/constants/messages.constant"
import { ErrorCode } from "@common/enums/error-code.enum"

export const errorMiddleware = (error: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error(`Error: ${error.message}`)

  if (error instanceof AppError) {
    return res.status(error.statusCode).json(new ErrorResponse(error.message, error.code, error.statusCode))
  }

  return res.status(500).json(new ErrorResponse(MESSAGES.SERVER_ERROR, ErrorCode.INTERNAL_SERVER_ERROR, 500))
}
