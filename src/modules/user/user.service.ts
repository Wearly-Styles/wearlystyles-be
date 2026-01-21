import { UserRepository } from "@repositories/user.repository"
import { hashPassword } from "@utils/hash.util"
import { AppError } from "@common/errors/app-error"
import { MESSAGES } from "@common/constants/messages.constant"
import { ErrorCode } from "@common/enums/error-code.enum"
import type { CreateUserDTO, UpdateUserDTO } from "./user.dto"
import type { Prisma } from "@prisma/client"
import type { PaginationQuery } from "@common/interfaces/pagination.interface"

export class UserService {
  private userRepository = new UserRepository()

  async createUser(data: CreateUserDTO) {
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
      profile: data.fullName || data.avatar
        ? {
            create: {
              fullName: data.fullName,
              avatar: data.avatar,
            },
          }
        : undefined,
    })

    const { password, ...userWithoutPassword } = user
    return userWithoutPassword
  }

  async getUserById(id: number) {
    const user = await this.userRepository.findById(id)
    if (!user) {
      throw new AppError(MESSAGES.USER_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    }

    const { password, ...userWithoutPassword } = user
    return userWithoutPassword
  }

  async getAllUsers(pagination: PaginationQuery) {
    const result = await this.userRepository.findAll(pagination)
    return {
      data: result.data.map(({ password, ...user }) => user),
      meta: result.meta,
    }
  }

  async updateUser(id: number, data: UpdateUserDTO) {
    const user = await this.userRepository.findById(id)
    if (!user) {
      throw new AppError(MESSAGES.USER_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    }

    const updateData: Prisma.UserUpdateInput = {}
    if (data.fullName || data.avatar) {
      updateData.profile = {
        upsert: {
          update: {
            fullName: data.fullName,
            avatar: data.avatar,
          },
          create: {
            fullName: data.fullName,
            avatar: data.avatar,
          },
        },
      }
    }

    const updated = await this.userRepository.update(id, updateData)
    if (!updated) {
      throw new AppError(MESSAGES.USER_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    }

    const { password, ...userWithoutPassword } = updated
    return userWithoutPassword
  }

  async deleteUser(id: number) {
    const user = await this.userRepository.findById(id)
    if (!user) {
      throw new AppError(MESSAGES.USER_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    }

    const deleted = await this.userRepository.delete(id)
    if (!deleted) {
      throw new AppError(MESSAGES.USER_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    }

    return { message: MESSAGES.USER_DELETED }
  }
}
