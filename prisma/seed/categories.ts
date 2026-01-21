import type { PrismaClient } from "@prisma/client"
import type { SeedContext } from "./seed.types"

export const seedCategories = async (
  prisma: PrismaClient,
): Promise<Pick<SeedContext, "casualCategoryId" | "formalCategoryId">> => {
  const casual =
    (await prisma.category.findFirst({ where: { name: "Casual" } })) ??
    (await prisma.category.create({
      data: {
        name: "Casual",
        description: "Everyday casual wear",
        icon: "tshirt",
      },
    }))

  const formal =
    (await prisma.category.findFirst({ where: { name: "Formal" } })) ??
    (await prisma.category.create({
      data: {
        name: "Formal",
        description: "Office and formal outfits",
        icon: "suit",
      },
    }))

  return { casualCategoryId: casual.id, formalCategoryId: formal.id }
}
