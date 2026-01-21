import type { PrismaClient } from "@prisma/client"
import type { SeedContext } from "./seed.types"

export const seedTags = async (prisma: PrismaClient): Promise<Pick<SeedContext, "summerTagId" | "denimTagId">> => {
  const summer =
    (await prisma.tag.findFirst({ where: { name: "Summer" } })) ??
    (await prisma.tag.create({
      data: {
        name: "Summer",
        type: "season",
      },
    }))

  const denim =
    (await prisma.tag.findFirst({ where: { name: "Denim" } })) ??
    (await prisma.tag.create({
      data: {
        name: "Denim",
        type: "material",
      },
    }))

  return { summerTagId: summer.id, denimTagId: denim.id }
}
