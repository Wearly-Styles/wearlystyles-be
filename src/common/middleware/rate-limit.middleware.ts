import type { Request, Response, NextFunction } from "express"
import rateLimit, { type Options } from "express-rate-limit"
import { AppError } from "@common/errors/app-error"
import { ErrorCode } from "@common/enums/error-code.enum"
import { MESSAGES } from "@common/constants/messages.constant"
import config from "@config/env"

export const createRateLimiter = (windowMs: number, maxRequests: number, options: Partial<Options> = {}) => {
  return rateLimit({
    windowMs,
    max: maxRequests,
    message: MESSAGES.TOO_MANY_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
    ...options,
    skip: (req: Request) => {
      // Skip rate limiting for health check
      return req.path === "/health"
    },
    handler: (_req: Request, _res: Response, _next: NextFunction) => {
      throw new AppError(MESSAGES.TOO_MANY_REQUESTS, 429, ErrorCode.SERVICE_UNAVAILABLE)
    },
  })
}

// Default rate limiters
export const globalRateLimiter = createRateLimiter(15 * 60 * 1000, 100) // 100 requests per 15 minutes

const authKeyGenerator: Options["keyGenerator"] = (req: Request) => {
  // Reduce false lockouts behind NAT by including email (when present) in the key.
  // Still keeps a per-IP component to make brute forcing harder than email-only keys.
  const ip = req.ip || req.socket?.remoteAddress || "unknown"
  const email = typeof (req.body as { email?: unknown } | undefined)?.email === "string" ? String(req.body.email) : ""
  const normalizedEmail = email.trim().toLowerCase()
  return normalizedEmail ? `${ip}:${normalizedEmail}` : ip
}

export const authRateLimiter = createRateLimiter(15 * 60 * 1000, config.node_env === "development" ? 100 : 5, {
  skipSuccessfulRequests: true,
  keyGenerator: authKeyGenerator,
}) // Auth: count failed attempts only, avoid blocking normal use in dev
export const apiRateLimiter = createRateLimiter(1 * 60 * 1000, 30) // 30 requests per minute
