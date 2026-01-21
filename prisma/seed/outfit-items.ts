import type { PrismaClient } from "@prisma/client"
import type { SeedContext } from "./seed.types"

export const seedOutfitItems = async (prisma: PrismaClient, context: SeedContext): Promise<void> => {
  await prisma.outfitItem.upsert({
    where: {
      outfitId_clothingItemId: {
        outfitId: context.adminOutfitId,
        clothingItemId: context.adminBlazerId,
      },
    },
    update: {},
    create: {
      outfitId: context.adminOutfitId,
      clothingItemId: context.adminBlazerId,
    },
  })
}
