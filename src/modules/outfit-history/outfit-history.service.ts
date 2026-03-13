import { prisma } from "@modules/prisma"
import { AppError } from "@common/errors/app-error"
import { ErrorCode } from "@common/enums/error-code.enum"
import { MESSAGES } from "@common/constants/messages.constant"
import type { CreateOutfitHistoryDTO, OutfitHistoryQueryDTO } from "./outfit-history.dto"

const outfitHistoryInclude = {
  outfit: {
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
  },
} as const

export class OutfitHistoryService {
  async wearToday(userId: number, data: CreateOutfitHistoryDTO) {
    const outfit = await prisma.outfit.findFirst({
      where: {
        id: data.outfitId,
        userId,
      },
      select: { id: true },
    })

    if (!outfit) {
      throw new AppError(MESSAGES.OUTFIT_NOT_FOUND_OR_FORBIDDEN, 404, ErrorCode.NOT_FOUND)
    }

    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

    const existing = await prisma.outfitHistory.findFirst({
      where: {
        userId,
        outfitId: data.outfitId,
        wornDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: outfitHistoryInclude,
    })

    if (existing) {
      if (typeof data.note === "string" && data.note.trim() && data.note.trim() !== existing.note) {
        return prisma.outfitHistory.update({
          where: { id: existing.id },
          data: { note: data.note.trim() },
          include: outfitHistoryInclude,
        })
      }

      return existing
    }

    return prisma.outfitHistory.create({
      data: {
        userId,
        outfitId: data.outfitId,
        wornDate: now,
        note: data.note?.trim() || undefined,
      },
      include: outfitHistoryInclude,
    })
  }

  async listHistories(userId: number, query: OutfitHistoryQueryDTO) {
    const from = query.from ? new Date(query.from) : undefined
    const to = query.to ? new Date(query.to) : undefined

    return prisma.outfitHistory.findMany({
      where: {
        userId,
        wornDate: {
          gte: from,
          lte: to,
        },
      },
      orderBy: {
        wornDate: "desc",
      },
      include: outfitHistoryInclude,
    })
  }
}
