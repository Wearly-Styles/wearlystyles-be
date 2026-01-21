import { prisma } from "@modules/prisma"
import { Prisma, type User } from "@prisma/client"
import type { PaginationQuery, PaginatedResponse } from "@common/interfaces/pagination.interface"
import { PaginationHelper } from "@helpers/pagination.helper"

export class UserRepository {
  async create(user: Prisma.UserCreateInput): Promise<User> {
    return prisma.user.create({ data: user })
  }

  async findById(id: number): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } })
  }

  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } })
  }

  async findAll(pagination: PaginationQuery): Promise<PaginatedResponse<User>> {
    const { page, limit, skip } = PaginationHelper.getPaginationParams(pagination)
    const [data, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count(),
    ])

    const meta = PaginationHelper.buildPaginationMeta(page, limit, total)
    return { data, meta }
  }

  async update(id: number, user: Prisma.UserUpdateInput): Promise<User | null> {
    try {
      return await prisma.user.update({ where: { id }, data: user })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        return null
      }
      throw error
    }
  }

  async delete(id: number): Promise<boolean> {
    const result = await prisma.user.deleteMany({ where: { id } })
    return result.count > 0
  }

  async exists(email: string): Promise<boolean> {
    const count = await prisma.user.count({ where: { email } })
    return count > 0
  }
}
