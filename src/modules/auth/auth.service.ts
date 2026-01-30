import { UserRepository } from "@repositories/user.repository"
import { hashPassword, comparePassword } from "@utils/hash.util"
import { generateToken, generateRefreshToken, verifyRefreshToken } from "@utils/jwt.util"
import { AuthError } from "@common/errors/auth-error"
import { AppError } from "@common/errors/app-error"
import { MESSAGES } from "@common/constants/messages.constant"
import { ErrorCode } from "@common/enums/error-code.enum"
import type { RegisterDTO, LoginDTO, GoogleAuthDTO } from "./auth.dto"
import type { User } from "@prisma/client"
import { googleClient } from "@config/google"
import config from "@config/env"

export class AuthService {
  private userRepository = new UserRepository()

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

    const { password, ...userWithoutPassword } = user
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

    const role = user.role ?? "user"
    const token = generateToken({ id: user.id, email: user.email, role })
    const refreshToken = generateRefreshToken({ id: user.id, email: user.email, role })

    await this.userRepository.update(user.id, {
      refreshToken,
    })

    const { password, ...userWithoutPassword } = user
    return {
      user: userWithoutPassword,
      token,
      refreshToken,
    }
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

      const { password, ...userWithoutPassword } = user;
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