import { UserRepository } from "@repositories/user.repository"
import { hashPassword } from "@utils/hash.util"
import { AppError } from "@common/errors/app-error"
import { MESSAGES } from "@common/constants/messages.constant"
import { ErrorCode } from "@common/enums/error-code.enum"
import type { CreateUserDTO, UpdateUserDTO } from "./user.dto"
import type { Prisma } from "@prisma/client"
import type { PaginationQuery } from "@common/interfaces/pagination.interface"
import type { User } from "@prisma/client"
import { prisma } from "@modules/prisma"
import { UserStatus } from "@common/enums/user-status.enum"
import { CloudinaryService } from "@common/utils/cloudinary.util"

export class UserService {
  private userRepository = new UserRepository()
  private cloudinaryService = new CloudinaryService()

  private sanitizeUser(user: User) {
    const { password, refreshToken, resetToken, resetTokenExpiresAt, ...safe } = user
    return safe
  }

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

    return this.sanitizeUser(user)
  }

  async getUserById(id: number) {
    const user = await this.userRepository.findById(id)
    if (!user) {
      throw new AppError(MESSAGES.USER_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    }

    return this.sanitizeUser(user)
  }

  async getAllUsers(pagination: PaginationQuery) {
    const result = await this.userRepository.findAll(pagination)
    return {
      data: result.data.map((user) => this.sanitizeUser(user)),
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

    return this.sanitizeUser(updated)
  }

  async updateUserStatus(id: number, status: UserStatus) {
    const user = await this.userRepository.findById(id)
    if (!user) {
      throw new AppError(MESSAGES.USER_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    }

    const updateData: Prisma.UserUpdateInput = {
      status,
      ...(status !== UserStatus.ACTIVE ? { refreshToken: null } : {}),
    }

    const updated = await this.userRepository.update(id, updateData)
    if (!updated) {
      throw new AppError(MESSAGES.USER_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    }

    return this.sanitizeUser(updated)
  }

  async deleteUser(id: number) {
    const user = await prisma.user.findUnique({ where: { id }, select: { id: true } })
    if (!user) {
      throw new AppError(MESSAGES.USER_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    }

    // Best-effort external cleanup (do not block DB deletion if Cloudinary fails).
    const clothingImages = await prisma.clothingItem.findMany({
      where: { userId: id },
      select: { image: true },
    })
    await Promise.allSettled(clothingImages.map((item) => this.cloudinaryService.deleteFileByUrl(item.image)))

    await prisma.$transaction(async (tx) => {
      // Social
      await tx.follow.deleteMany({ where: { OR: [{ followerId: id }, { followingId: id }] } })
      await tx.notification.deleteMany({ where: { OR: [{ userId: id }, { actorId: id }] } })

      // Posts + interactions (including other users' interactions on this user's posts)
      await tx.like.deleteMany({ where: { userId: id } })
      await tx.comment.deleteMany({ where: { userId: id } })
      await tx.like.deleteMany({ where: { post: { userId: id } } })
      await tx.comment.deleteMany({ where: { post: { userId: id } } })
      await tx.post.deleteMany({ where: { userId: id } })

      // Outfits
      await tx.outfitPlan.deleteMany({ where: { OR: [{ userId: id }, { outfit: { userId: id } }] } })
      await tx.outfitHistory.deleteMany({ where: { OR: [{ userId: id }, { outfit: { userId: id } }] } })
      await tx.outfitItem.deleteMany({ where: { outfit: { userId: id } } })
      await tx.outfit.deleteMany({ where: { userId: id } })

      // Wardrobe
      await tx.clothingItemTag.deleteMany({ where: { clothingItem: { userId: id } } })
      await tx.clothingItem.deleteMany({ where: { userId: id } })
      await tx.category.deleteMany({ where: { userId: id } })
      await tx.tag.deleteMany({ where: { userId: id } })

      // Billing
      await tx.payment.deleteMany({ where: { userId: id } })

      // Profile + user
      await tx.userProfile.deleteMany({ where: { userId: id } })
      await tx.user.delete({ where: { id } })
    })

    return { message: MESSAGES.USER_DELETED }
  }
}
