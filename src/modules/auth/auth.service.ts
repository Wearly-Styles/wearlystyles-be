import { UserRepository } from "@repositories/user.repository"
import { hashPassword, comparePassword } from "@utils/hash.util"
import { generateToken, generateRefreshToken, verifyRefreshToken } from "@utils/jwt.util"
import { AuthError } from "@common/errors/auth-error"
import { AppError } from "@common/errors/app-error"
import { MESSAGES } from "@common/constants/messages.constant"
import { ErrorCode } from "@common/enums/error-code.enum"
import { UserStatus } from "@common/enums/user-status.enum"
import type { RegisterDTO, LoginDTO, GoogleLoginDTO, GoogleCodeLoginDTO, GoogleAuthDTO } from "./auth.dto"
import type { User } from "@prisma/client"
import { googleClient } from "@config/google"
import config from "@config/env"
import logger from "@config/logger"

export class AuthService {
  private userRepository = new UserRepository()
  private static readonly REQUEST_TIMEOUT_MS = 8000

  private async fetchWithTimeout(url: string, options?: RequestInit) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), AuthService.REQUEST_TIMEOUT_MS)
    try {
      return await fetch(url, { ...options, signal: controller.signal })
    } finally {
      clearTimeout(timeoutId)
    }
  }

  private async verifyGoogleIdToken(idToken: string) {
    const clientId = config.google.clientId
    if (!clientId) {
      throw new AppError(MESSAGES.SERVICE_UNAVAILABLE, 503, ErrorCode.SERVICE_UNAVAILABLE)
    }

    const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
    const response = await this.fetchWithTimeout(url)
    if (!response.ok) {
      throw new AuthError(MESSAGES.AUTH_INVALID_CREDENTIALS)
    }

    const data = (await response.json()) as {
      aud?: string
      email?: string
      email_verified?: string
      name?: string
      picture?: string
      sub?: string
    }

    if (data.aud !== clientId) {
      logger.warn("Google token aud mismatch")
      throw new AuthError(MESSAGES.AUTH_INVALID_CREDENTIALS)
    }

    if (data.email_verified !== "true") {
      throw new AuthError(MESSAGES.AUTH_INVALID_CREDENTIALS)
    }

    if (!data.email) {
      throw new AuthError(MESSAGES.AUTH_INVALID_CREDENTIALS)
    }

    return data
  }

  async register(data: RegisterDTO): Promise<{ user: Partial<User>; token: string; refreshToken: string }> {
    const existingUser = await this.userRepository.findByEmail(data.email)
    if (existingUser) {
      throw new AppError(MESSAGES.AUTH_EMAIL_EXISTS, 409, ErrorCode.CONFLICT)
    }

    const hashedPassword = await hashPassword(data.password)

    const user = await this.userRepository.create({
      email: data.email,
      password: hashedPassword,
      role: "user",
      status: "active",
      profile: data.fullName
        ? {
          create: {
            fullName: data.fullName,
          },
        }
        : undefined,
    })

    const role = user.role ?? "user"
    const token = generateToken({ id: user.id, email: user.email, role })
    const refreshToken = generateRefreshToken({ id: user.id, email: user.email, role })

    await this.userRepository.update(user.id, { refreshToken })

    const { password, refreshToken: _refreshToken, resetToken: _resetToken, resetTokenExpiresAt: _resetTokenExpiresAt, ...userWithoutPassword } = user
    return {
      user: userWithoutPassword,
      token,
      refreshToken,
    }
  }

  async login(data: LoginDTO): Promise<{ user: Partial<User>; token: string; refreshToken: string }> {
    const user = await this.userRepository.findByEmail(data.email)
    if (!user) {
      throw new AuthError(MESSAGES.AUTH_INVALID_CREDENTIALS)
    }

    const isPasswordValid = await comparePassword(data.password, user.password)
    if (!isPasswordValid) {
      throw new AuthError(MESSAGES.AUTH_INVALID_CREDENTIALS)
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

    const role = user.role ?? "user"
    const token = generateToken({ id: user.id, email: user.email, role })
    const refreshToken = generateRefreshToken({ id: user.id, email: user.email, role })

    await this.userRepository.update(user.id, {
      refreshToken,
    })

    const { password, refreshToken: _refreshToken, resetToken: _resetToken, resetTokenExpiresAt: _resetTokenExpiresAt, ...userWithoutPassword } = user
    return {
      user: userWithoutPassword,
      token,
      refreshToken,
    }
  }

  async loginWithGoogle(
    data: GoogleLoginDTO,
  ): Promise<{ user: Partial<User>; token: string; refreshToken: string }> {
    const payload = await this.verifyGoogleIdToken(data.idToken)
    const email = payload.email!.toLowerCase()

    let user = await this.userRepository.findByEmail(email)
    if (user?.status && user.status !== UserStatus.ACTIVE) {
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
    if (!user) {
      const tempPassword = await hashPassword(`google_${Date.now()}_${Math.random()}`)
      user = await this.userRepository.create({
        email,
        password: tempPassword,
        role: "user",
        status: "active",
        profile: payload.name || payload.picture
          ? {
              create: {
                fullName: payload.name || undefined,
                avatar: payload.picture || undefined,
              },
            }
          : undefined,
      })
    }

    const role = user.role ?? "user"
    const token = generateToken({ id: user.id, email: user.email, role })
    const refreshToken = generateRefreshToken({ id: user.id, email: user.email, role })

    await this.userRepository.update(user.id, { refreshToken })

    const { password, refreshToken: _refreshToken, resetToken: _resetToken, resetTokenExpiresAt: _resetTokenExpiresAt, ...userWithoutPassword } = user
    return {
      user: userWithoutPassword,
      token,
      refreshToken,
    }
  }

  async loginWithGoogleCode(
    data: GoogleCodeLoginDTO,
  ): Promise<{ user: Partial<User>; token: string; refreshToken: string }> {
    const clientId = config.google.clientId
    const clientSecret = config.google.clientSecret
    if (!clientId || !clientSecret) {
      throw new AppError(MESSAGES.SERVICE_UNAVAILABLE, 503, ErrorCode.SERVICE_UNAVAILABLE)
    }

    const body = new URLSearchParams({
      code: data.code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: data.redirectUri,
      grant_type: "authorization_code",
    })

    const response = await this.fetchWithTimeout("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => "")
      logger.error("Google token exchange failed", {
        status: response.status,
        body: errorText,
      })
      throw new AuthError(MESSAGES.AUTH_INVALID_CREDENTIALS)
    }

    const tokenData = (await response.json()) as { id_token?: string }
    if (!tokenData.id_token) {
      logger.error("Google token exchange missing id_token")
      throw new AuthError(MESSAGES.AUTH_INVALID_CREDENTIALS)
    }

    return this.loginWithGoogle({ idToken: tokenData.id_token })
  }

  async logout(userId: number): Promise<void> {
    await this.userRepository.update(userId, { refreshToken: null })
  }

  async refreshAccessToken(refreshToken: string): Promise<{ token: string }> {
    const payload = verifyRefreshToken(refreshToken)
    if (!payload) {
      throw new AuthError(MESSAGES.AUTH_TOKEN_INVALID)
    }

    const user = await this.userRepository.findById(payload.id)
    if (!user || user.refreshToken !== refreshToken) {
      throw new AuthError(MESSAGES.AUTH_TOKEN_INVALID)
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

    const role = payload.role ?? user.role ?? "user"
    const token = generateToken({ id: payload.id, email: payload.email, role })
    return { token }
  }

  async googleAuth(data: GoogleAuthDTO): Promise<{ user: Partial<User>; token: string; refreshToken: string }> {
    try {
      const { tokens } = await googleClient.getToken(data.authCode);

      const ticket = await googleClient.verifyIdToken({
        idToken: tokens.id_token!,
        audience: config.google.clientId,
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        throw new AuthError(MESSAGES.AUTH_GOOGLE_FAILED);
      }

      let user = await this.userRepository.findByEmail(payload.email);

      if (user?.status && user.status !== UserStatus.ACTIVE) {
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

      if (!user) {
        user = await this.userRepository.create({
          email: payload.email,
          password: "",
          role: "user",
          status: "active",
          profile: {
            create: {
              fullName: payload.name || "Google User",
            },
          },
        });
      }

      const role = user.role ?? "user";
      const token = generateToken({ id: user.id, email: user.email, role });
      const refreshToken = generateRefreshToken({ id: user.id, email: user.email, role });

      await this.userRepository.update(user.id, { refreshToken });

      const { password, refreshToken: _refreshToken, resetToken: _resetToken, resetTokenExpiresAt: _resetTokenExpiresAt, ...userWithoutPassword } = user;
      return {
        user: userWithoutPassword,
        token,
        refreshToken,
      };
    } catch (error) {
      console.error("Google Auth Error Detail:", error); // Log chi tiết để debug
      throw new AuthError(MESSAGES.AUTH_GOOGLE_FAILED);
    }
  }
}
