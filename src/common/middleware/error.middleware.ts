import type { Request, Response, NextFunction } from "express"
import { AppError } from "@common/errors/app-error"
import { ErrorResponse } from "@common/responses/error.response"
import logger from "@config/logger"

export const errorMiddleware = (error: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error(`Error: ${error.message}`)

  if (error instanceof AppError) {
    return res.status(error.statusCode).json(new ErrorResponse(error.message, error.code, error.statusCode))
  }

  return res.status(500).json(new ErrorResponse("Internal server error", error.message, 500))
}
