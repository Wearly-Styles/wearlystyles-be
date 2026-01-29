import type { PrismaClient } from "@prisma/client"
import type { SeedContext } from "./seed.types"

export const seedCategories = async (
  prisma: PrismaClient,
  context: SeedContext,
): Promise<Pick<SeedContext, "casualCategoryId" | "formalCategoryId">> => {
  const userId  = context.regularUserId
  const casual =
    (await prisma.category.findFirst({ where: { name: "Casual", userId } })) ??
    (await prisma.category.create({
      data: {
        name: "Casual",
        description: "Everyday casual wear",
        icon: "tshirt",
        userId,
      },
    }))

  const formal =
    (await prisma.category.findFirst({ where: { name: "Formal", userId } })) ??
    (await prisma.category.create({
      data: {
        name: "Formal",
        description: "Office and formal outfits",
        icon: "suit",
        userId,
      },
    }))

  return { casualCategoryId: casual.id, formalCategoryId: formal.id }
}
