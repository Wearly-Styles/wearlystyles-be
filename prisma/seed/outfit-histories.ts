import type { PrismaClient } from "@prisma/client"
import type { SeedContext } from "./seed.types"

export const seedOutfitHistories = async (prisma: PrismaClient, context: SeedContext): Promise<void> => {
  await prisma.outfitHistory.create({
    data: {
      userId: context.adminUserId,
      outfitId: context.adminOutfitId,
      wornDate: new Date("2025-12-20"),
      note: "Great fit for meeting",
    },
  })
}
