import type { PrismaClient } from "@prisma/client"
import type { SeedContext } from "./seed.types"

export const seedOutfits = async (prisma: PrismaClient, context: SeedContext): Promise<Pick<SeedContext, "adminOutfitId">> => {
  const outfit =
    (await prisma.outfit.findFirst({
      where: { name: "Office Smart", userId: context.adminUserId },
    })) ??
    (await prisma.outfit.create({
      data: {
        userId: context.adminUserId,
        name: "Office Smart",
        occasion: "work",
        weather: "mild",
        isFavorite: true,
      },
    }))

  return { adminOutfitId: outfit.id }
}
