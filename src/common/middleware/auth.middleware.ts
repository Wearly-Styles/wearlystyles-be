import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "@utils/jwt.util";
import { AuthError } from "@common/errors/auth-error";
import { AppError } from "@common/errors/app-error";
import { MESSAGES } from "@common/constants/messages.constant";
import { ErrorCode } from "@common/enums/error-code.enum";
import { prisma } from "@modules/prisma";
import { UserStatus } from "@common/enums/user-status.enum";

export const authMiddleware = async (req: Request, _res: Response, next: NextFunction) => {
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

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, role: true, status: true },
    });

    if (!user) {
      console.error("[AuthMiddleware] Token user not found");
      throw new AuthError(MESSAGES.AUTH_TOKEN_INVALID);
    }

    if (user.status && user.status !== UserStatus.ACTIVE) {
      const message =
        user.status === UserStatus.SUSPENDED
          ? MESSAGES.AUTH_ACCOUNT_SUSPENDED
          : user.status === UserStatus.INACTIVE
            ? MESSAGES.AUTH_ACCOUNT_INACTIVE
            : user.status === UserStatus.DELETED
              ? MESSAGES.AUTH_ACCOUNT_DELETED
              : MESSAGES.FORBIDDEN
      throw new AppError(message, 403, ErrorCode.FORBIDDEN)
    }

    req.user = { id: user.id, email: user.email, role: user.role ?? "user" };

    console.log(`[AuthMiddleware] User authenticated: ID ${req.user.id}`);

    next();
  } catch (error) {
    next(error);
  }
};
