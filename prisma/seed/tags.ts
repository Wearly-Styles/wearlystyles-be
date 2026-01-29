import type { PrismaClient } from "@prisma/client"
import type { SeedContext } from "./seed.types"

export const seedTags = async (
  prisma: PrismaClient, 
  context: SeedContext
): Promise<Pick<SeedContext, "summerTagId" | "denimTagId">> => {
  const userId  = context.regularUserId
  const summer =
    (await prisma.tag.findFirst({ where: { name: "Summer", userId } })) ??
    (await prisma.tag.create({
      data: {
        name: "Summer",
        type: "season",
        userId,
      },
    }))

  const denim =
    (await prisma.tag.findFirst({ where: { name: "Denim", userId } })) ??
    (await prisma.tag.create({
      data: {
        name: "Denim",
        type: "material",
        userId,
      },
    }))

  return { summerTagId: summer.id, denimTagId: denim.id }
}
