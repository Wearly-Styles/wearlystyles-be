import type { PrismaClient } from "@prisma/client"
import type { SeedContext } from "./seed.types"

export const seedComments = async (prisma: PrismaClient, context: SeedContext): Promise<void> => {
  await prisma.comment.create({
    data: {
      postId: context.postId,
      userId: context.regularUserId,
      content: "Looks great!",
    },
  })
}
