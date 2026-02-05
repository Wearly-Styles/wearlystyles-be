import type { Request, Response, NextFunction } from "express"
import { AuthService } from "./auth.service"
import { SuccessResponse } from "@common/responses/success.response"
import type { RegisterDTO, LoginDTO, GoogleLoginDTO, GoogleCodeLoginDTO } from "./auth.dto"

export class AuthController {
  private authService = new AuthService()

  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const data: RegisterDTO = req.body
      const result = await this.authService.register(data)

      res.status(201).json(new SuccessResponse("Registration successful", result, 201))
    } catch (error) {
      next(error)
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const data: LoginDTO = req.body
      const result = await this.authService.login(data)

      res.json(new SuccessResponse("Login successful", result))
    } catch (error) {
      next(error)
    }
  }

  async loginWithGoogle(req: Request, res: Response, next: NextFunction) {
    try {
      const data: GoogleLoginDTO = req.body
      const result = await this.authService.loginWithGoogle(data)

      res.json(new SuccessResponse("Login successful", result))
    } catch (error) {
      next(error)
    }
  }

  async loginWithGoogleCode(req: Request, res: Response, next: NextFunction) {
    try {
      console.log("[Auth] login/google-code hit");
      const data: GoogleCodeLoginDTO = req.body
      const result = await this.authService.loginWithGoogleCode(data)

      res.json(new SuccessResponse("Login successful", result))
    } catch (error) {
      next(error)
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new Error("User not authenticated")
      }

      await this.authService.logout(req.user.id)
      res.json(new SuccessResponse("Logout successful"))
    } catch (error) {
      next(error)
    }
  }

  async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body
      const result = await this.authService.refreshAccessToken(refreshToken)

      res.json(new SuccessResponse("Token refreshed", result))
    } catch (error) {
      next(error)
    }
  }
}
