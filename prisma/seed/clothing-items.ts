import type { PrismaClient } from "@prisma/client"
import type { SeedContext } from "./seed.types"

export const seedClothingItems = async (
  prisma: PrismaClient,
  context: SeedContext,
): Promise<Pick<SeedContext, "adminTeeId" | "adminBlazerId" | "userJeansId">> => {
  const adminTee =
    (await prisma.clothingItem.findFirst({
      where: { name: "Classic Tee", userId: context.adminUserId },
    })) ??
    (await prisma.clothingItem.create({
      data: {
        userId: context.adminUserId,
        categoryId: context.casualCategoryId,
        name: "Classic Tee",
        color: "white",
        image: "https://example.com/items/classic-tee.png",
        isDefault: true,
        isFavorite: true,
        description: "Soft cotton t-shirt",
        season: "summer",
        material: "cotton",
      },
    }))

  const adminBlazer =
    (await prisma.clothingItem.findFirst({
      where: { name: "Navy Blazer", userId: context.adminUserId },
    })) ??
    (await prisma.clothingItem.create({
      data: {
        userId: context.adminUserId,
        categoryId: context.formalCategoryId,
        name: "Navy Blazer",
        color: "navy",
        image: "https://example.com/items/navy-blazer.png",
        isDefault: false,
        isFavorite: false,
        description: "Formal blazer for office",
        season: "all",
        material: "wool",
      },
    }))

  const userJeans =
    (await prisma.clothingItem.findFirst({
      where: { name: "Slim Jeans", userId: context.regularUserId },
    })) ??
    (await prisma.clothingItem.create({
      data: {
        userId: context.regularUserId,
        categoryId: context.casualCategoryId,
        name: "Slim Jeans",
        color: "blue",
        image: "https://example.com/items/slim-jeans.png",
        isDefault: true,
        isFavorite: true,
        description: "Slim fit denim jeans",
        season: "all",
        material: "denim",
      },
    }))

  return { adminTeeId: adminTee.id, adminBlazerId: adminBlazer.id, userJeansId: userJeans.id }
}
