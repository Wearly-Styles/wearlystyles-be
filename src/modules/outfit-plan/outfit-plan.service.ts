import { prisma } from "@modules/prisma"
import { AppError } from "@common/errors/app-error"
import { ErrorCode } from "@common/enums/error-code.enum"
import type { OutfitPlanItemDTO, OutfitPlanQueryDTO, UpdateOutfitPlanDTO } from "./outfit-plan.dto"

export class OutfitPlanService {
  async createPlans(userId: number, items: OutfitPlanItemDTO[]) {
    const outfitIds = Array.from(new Set(items.map((item) => item.outfitId)))

    const outfits = await prisma.outfit.findMany({
      where: {
        id: { in: outfitIds },
        userId,
      },
      select: { id: true },
    })

    if (outfits.length !== outfitIds.length) {
      throw new AppError("Outfit not found or does not belong to user", 400, ErrorCode.BAD_REQUEST)
    }

    const created = await prisma.$transaction(
      items.map((item) =>
        prisma.outfitPlan.create({
          data: {
            userId,
            outfitId: item.outfitId,
            planDate: new Date(item.planDate),
            planType: item.planType,
            reminderSent: item.reminderSent ?? false,
          },
        }),
      ),
    )

    return created
  }

  async listPlans(userId: number, query: OutfitPlanQueryDTO) {
    const from = query.from ? new Date(query.from) : undefined
    const to = query.to ? new Date(query.to) : undefined

    return prisma.outfitPlan.findMany({
      where: {
        userId,
        planDate: {
          gte: from,
          lte: to,
        },
      },
      orderBy: {
        planDate: "asc",
      },
      include: {
        outfit: true,
      },
    })
  }

  async updatePlan(userId: number, id: number, data: UpdateOutfitPlanDTO) {
    const existing = await prisma.outfitPlan.findFirst({
      where: {
        id,
        userId,
      },
    })

    if (!existing) {
      throw new AppError("Outfit plan not found", 404, ErrorCode.NOT_FOUND)
    }

    if (data.outfitId) {
      const outfit = await prisma.outfit.findFirst({
        where: {
          id: data.outfitId,
          userId,
        },
        select: { id: true },
      })

      if (!outfit) {
        throw new AppError("Outfit not found or does not belong to user", 400, ErrorCode.BAD_REQUEST)
      }
    }

    return prisma.outfitPlan.update({
      where: { id },
      data: {
        outfitId: data.outfitId,
        planDate: data.planDate ? new Date(data.planDate) : undefined,
        planType: data.planType,
        reminderSent: data.reminderSent,
      },
      include: {
        outfit: true,
      },
    })
  }

  async deletePlan(userId: number, id: number) {
    const existing = await prisma.outfitPlan.findFirst({
      where: {
        id,
        userId,
      },
    })

    if (!existing) {
      throw new AppError("Outfit plan not found", 404, ErrorCode.NOT_FOUND)
    }

    await prisma.outfitPlan.delete({
      where: { id },
    })

    return { id }
  }
}
