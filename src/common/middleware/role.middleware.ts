import type { Request, Response, NextFunction } from "express"
import { AppError } from "@common/errors/app-error"
import { ErrorCode } from "@common/enums/error-code.enum"
import { MESSAGES } from "@common/constants/messages.constant"
import { ROLE_PERMISSIONS } from "@common/constants/roles.constant"

export const roleMiddleware = (requiredRoles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError(MESSAGES.AUTH_UNAUTHORIZED, 401, ErrorCode.UNAUTHORIZED)
      }

      if (!requiredRoles.includes(req.user.role)) {
        throw new AppError(MESSAGES.FORBIDDEN, 403, ErrorCode.FORBIDDEN)
      }

      next()
    } catch (error) {
      next(error)
    }
  }
}

export const permissionMiddleware = (requiredPermission: string) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError(MESSAGES.AUTH_UNAUTHORIZED, 401, ErrorCode.UNAUTHORIZED)
      }

      const permissions = ROLE_PERMISSIONS[req.user.role as keyof typeof ROLE_PERMISSIONS] || []

      if (!permissions.includes(requiredPermission)) {
        throw new AppError(MESSAGES.FORBIDDEN, 403, ErrorCode.FORBIDDEN)
      }

      next()
    } catch (error) {
      next(error)
    }
  }
}
