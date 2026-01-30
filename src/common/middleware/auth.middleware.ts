import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "@utils/jwt.util";
import { AuthError } from "@common/errors/auth-error";
import { MESSAGES } from "@common/constants/messages.constant";

export const authMiddleware = (req: Request, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      console.error("[AuthMiddleware] No Authorization header found");
      throw new AuthError(MESSAGES.AUTH_UNAUTHORIZED);
    }

    if (!authHeader.startsWith("Bearer ")) {
      console.error("[AuthMiddleware] Invalid Authorization format (must be Bearer)");
      throw new AuthError(MESSAGES.AUTH_TOKEN_INVALID);
    }

    const token = authHeader.split(" ")[1];

    const decoded = verifyToken(token);

    if (!decoded) {
      console.error("[AuthMiddleware] Token verification failed (null payload)");
      throw new AuthError(MESSAGES.AUTH_TOKEN_INVALID);
    }

    req.user = decoded;

    console.log(`[AuthMiddleware] User authenticated: ID ${req.user.id}`);

    next();
  } catch (error) {
    next(error);
  }
};