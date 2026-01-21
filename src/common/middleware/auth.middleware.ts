import type { Request, Response, NextFunction } from "express"
import { verifyToken } from "@utils/jwt.util"
import { AuthError } from "@common/errors/auth-error"
import { MESSAGES } from "@common/constants/messages.constant"

export const authMiddleware = (req: Request, _res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(" ")[1]

    if (!token) {
      throw new AuthError(MESSAGES.AUTH_UNAUTHORIZED)
    }

    const user = verifyToken(token)

    if (!user) {
      throw new AuthError(MESSAGES.AUTH_TOKEN_INVALID)
    }

    req.user = user
    next()
  } catch (error) {
    next(error)
  }
}
