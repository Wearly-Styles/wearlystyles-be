import { prisma } from "@modules/prisma"
import { AppError } from "@common/errors/app-error"
import { ErrorCode } from "@common/enums/error-code.enum"
import { MESSAGES } from "@common/constants/messages.constant"
import type { CreateOutfitDTO } from "./outfit.dto"

export class OutfitService {
  async createOutfit(userId: number, data: CreateOutfitDTO) {
    const itemIds = Array.from(new Set(data.items || []))
    if (itemIds.length === 0) {
      throw new AppError(MESSAGES.OUTFIT_ITEMS_REQUIRED, 400, ErrorCode.BAD_REQUEST)
    }

    const items = await prisma.clothingItem.findMany({
      where: {
        id: { in: itemIds },
        userId,
      },
      select: { id: true },
    })

    if (items.length !== itemIds.length) {
      throw new AppError(MESSAGES.OUTFIT_ITEMS_INVALID, 400, ErrorCode.BAD_REQUEST)
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

    return outfit
  }
}
