import type { PrismaClient } from "@prisma/client"
import type { SeedContext } from "./seed.types"

export const seedOutfitPlans = async (prisma: PrismaClient, context: SeedContext): Promise<void> => {
  await prisma.outfitPlan.create({
    data: {
      userId: context.adminUserId,
      outfitId: context.adminOutfitId,
      planDate: new Date("2026-01-01"),
      planType: "calendar",
      reminderSent: false,
    },
  })
}
