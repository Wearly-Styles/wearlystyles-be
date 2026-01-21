import type { Request, Response, NextFunction } from "express"
import rateLimit from "express-rate-limit"
import { AppError } from "@common/errors/app-error"
import { ErrorCode } from "@common/enums/error-code.enum"

export const createRateLimiter = (windowMs: number, maxRequests: number) => {
  return rateLimit({
    windowMs,
    max: maxRequests,
    message: "Too many requests from this IP, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req: Request) => {
      // Skip rate limiting for health check
      return req.path === "/health"
    },
    handler: (_req: Request, _res: Response, _next: NextFunction) => {
      throw new AppError("Too many requests", 429, ErrorCode.SERVICE_UNAVAILABLE)
    },
  })
}

// Default rate limiters
export const globalRateLimiter = createRateLimiter(15 * 60 * 1000, 100) // 100 requests per 15 minutes
export const authRateLimiter = createRateLimiter(15 * 60 * 1000, 5) // 5 attempts per 15 minutes
export const apiRateLimiter = createRateLimiter(1 * 60 * 1000, 30) // 30 requests per minute
