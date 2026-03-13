import { prisma } from "@modules/prisma"
import { AppError } from "@common/errors/app-error"
import { ErrorCode } from "@common/enums/error-code.enum"
import { MESSAGES } from "@common/constants/messages.constant"
import type { CreateOutfitDTO, UpdateOutfitDTO } from "./outfit.dto"

const outfitInclude = {
  items: {
    include: {
      clothingItem: {
        include: {
          category: true,
          tags: {
            include: { tag: true },
          },
        },
      },
    },
  },
} as const

export class OutfitService {
  private async resolveValidItemIds(userId: number, items?: number[]) {
    if (!items) {
      return null
    }

    const itemIds = Array.from(new Set(items || []))
    if (itemIds.length === 0) {
      throw new AppError(MESSAGES.OUTFIT_ITEMS_REQUIRED, 400, ErrorCode.BAD_REQUEST)
    }

    const resolvedItems = await prisma.clothingItem.findMany({
      where: {
        id: { in: itemIds },
        userId,
      },
      select: { id: true },
    })

    if (resolvedItems.length !== itemIds.length) {
      throw new AppError(MESSAGES.OUTFIT_ITEMS_INVALID, 400, ErrorCode.BAD_REQUEST)
    }

    return itemIds
  }

  async listOutfits(userId: number) {
    return prisma.outfit.findMany({
      where: { userId },
      orderBy: {
        createdAt: "desc",
      },
      include: outfitInclude,
    })
  }

  async countOutfits(userId: number) {
    const count = await prisma.outfit.count({
      where: { userId },
    })

    return { count }
  }

  async createOutfit(userId: number, data: CreateOutfitDTO) {
    const itemIds = await this.resolveValidItemIds(userId, data.items)
    if (!itemIds?.length) {
      throw new AppError(MESSAGES.OUTFIT_ITEMS_REQUIRED, 400, ErrorCode.BAD_REQUEST)
    }

    const outfit = await prisma.outfit.create({
      data: {
        userId,
        name: data.name,
        occasion: data.occasion,
        weather: data.weather,
        isFavorite: data.isFavorite ?? false,
        items: {
          create: itemIds.map((clothingItemId) => ({ clothingItemId })),
        },
      },
      include: outfitInclude,
    })

    return outfit
  }

  async getOutfitById(userId: number, outfitId: number) {
    const outfit = await prisma.outfit.findFirst({
      where: {
        id: outfitId,
        userId,
      },
      include: {
        items: {
          include: {
            clothingItem: {
              include: {
                category: true,
                tags: {
                  include: { tag: true },
                },
              },
            },
          },
        },
      },
    })

    if (!outfit) {
      throw new AppError(MESSAGES.OUTFIT_NOT_FOUND_OR_FORBIDDEN, 404, ErrorCode.NOT_FOUND)
    }

    return outfit
  }

  async updateOutfit(userId: number, outfitId: number, data: UpdateOutfitDTO) {
    const existing = await prisma.outfit.findFirst({
      where: {
        id: outfitId,
        userId,
      },
      select: { id: true },
    })

    if (!existing) {
      throw new AppError(MESSAGES.OUTFIT_NOT_FOUND_OR_FORBIDDEN, 404, ErrorCode.NOT_FOUND)
    }

    const itemIds = await this.resolveValidItemIds(userId, data.items)

    await prisma.$transaction(async (tx) => {
      await tx.outfit.update({
        where: { id: outfitId },
        data: {
          name: data.name,
          occasion: data.occasion,
          weather: data.weather,
          isFavorite: data.isFavorite,
        },
      })

      if (itemIds) {
        await tx.outfitItem.deleteMany({
          where: { outfitId },
        })
        await tx.outfitItem.createMany({
          data: itemIds.map((clothingItemId) => ({
            outfitId,
            clothingItemId,
          })),
        })
      }
    })

    return prisma.outfit.findFirst({
      where: {
        id: outfitId,
        userId,
      },
      include: outfitInclude,
    })
  }

  async deleteOutfit(userId: number, outfitId: number) {
    const outfit = await prisma.outfit.findFirst({
      where: {
        id: outfitId,
        userId,
      },
      select: {
        id: true,
        _count: {
          select: {
            plans: true,
            histories: true,
          },
        },
      },
    })

    if (!outfit) {
      throw new AppError(MESSAGES.OUTFIT_NOT_FOUND_OR_FORBIDDEN, 404, ErrorCode.NOT_FOUND)
    }

    if (outfit._count.plans > 0 || outfit._count.histories > 0) {
      throw new AppError(MESSAGES.OUTFIT_IN_USE, 409, ErrorCode.CONFLICT)
    }

    await prisma.$transaction([
      prisma.outfitItem.deleteMany({
        where: { outfitId },
      }),
      prisma.outfit.delete({
        where: { id: outfitId },
      }),
    ])

    return { id: outfitId }
  }
}
