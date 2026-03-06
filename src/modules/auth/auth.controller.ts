import type { Request, Response, NextFunction } from "express";
import { AuthService } from "./auth.service";
import { SuccessResponse } from "@common/responses/success.response";
import { AuthError } from "@common/errors/auth-error";
import { MESSAGES } from "@common/constants/messages.constant";
import type {
  RegisterDTO,
  LoginDTO,
  GoogleLoginDTO,
  GoogleCodeLoginDTO,
  GoogleAuthDTO,
} from "./auth.dto";

export class AuthController {
  private authService = new AuthService();

  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const data: RegisterDTO = req.body;
      const result = await this.authService.register(data);

      res
        .status(201)
        .json(new SuccessResponse(MESSAGES.AUTH_REGISTER_SUCCESS, result, 201));
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const data: LoginDTO = req.body;
      const result = await this.authService.login(data);

      res.json(new SuccessResponse(MESSAGES.AUTH_LOGIN_SUCCESS, result));
    } catch (error) {
      next(error);
    }
  }

  // async loginWithGoogle(req: Request, res: Response, next: NextFunction) {
  //   try {
  //     const data: GoogleLoginDTO = req.body;
  //     const result = await this.authService.loginWithGoogle(data);

  //     res.json(new SuccessResponse("Login successful", result));
  //   } catch (error) {
  //     next(error);
  //   }
  // }

  async loginWithGoogleCode(req: Request, res: Response, next: NextFunction) {
    try {
      console.log("[Auth] login/google-code hit");
      const data: GoogleCodeLoginDTO = req.body;
      const result = await this.authService.loginWithGoogleCode(data);

      res.json(new SuccessResponse(MESSAGES.AUTH_GOOGLE_LOGIN_SUCCESS, result));
    } catch (error) {
      next(error);
    }
  }

  async loginWithGoogle(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw new AuthError(MESSAGES.AUTH_UNAUTHORIZED);
      }

      await this.authService.logout(userId);
      res.json(new SuccessResponse(MESSAGES.AUTH_LOGOUT_SUCCESS));
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw new AuthError(MESSAGES.AUTH_UNAUTHORIZED);
      }

      await this.authService.logout(userId);
      res.json(new SuccessResponse(MESSAGES.AUTH_LOGOUT_SUCCESS));
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      const result = await this.authService.refreshAccessToken(refreshToken);

      res.json(new SuccessResponse(MESSAGES.AUTH_TOKEN_REFRESHED, result));
    } catch (error) {
      next(error);
    }
  }

  async googleLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const data: GoogleAuthDTO = req.body;
      const result = await this.authService.googleAuth(data);

      res.json(new SuccessResponse(MESSAGES.AUTH_GOOGLE_LOGIN_SUCCESS, result));
    } catch (error) {
      next(error);
    }
  }
}
