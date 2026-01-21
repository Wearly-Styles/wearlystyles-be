import type { PrismaClient } from "@prisma/client"
import type { SeedContext } from "./seed.types"

export const seedClothingItemTags = async (prisma: PrismaClient, context: SeedContext): Promise<void> => {
  await prisma.clothingItemTag.upsert({
    where: {
      clothingItemId_tagId: {
        clothingItemId: context.adminTeeId,
        tagId: context.summerTagId,
      },
    },
    update: {},
    create: {
      clothingItemId: context.adminTeeId,
      tagId: context.summerTagId,
    },
  })

  await prisma.clothingItemTag.upsert({
    where: {
      clothingItemId_tagId: {
        clothingItemId: context.userJeansId,
        tagId: context.denimTagId,
      },
    },
    update: {},
    create: {
      clothingItemId: context.userJeansId,
      tagId: context.denimTagId,
    },
  })
}
