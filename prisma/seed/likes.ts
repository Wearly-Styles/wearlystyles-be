import type { PrismaClient } from "@prisma/client"
import type { SeedContext } from "./seed.types"

export const seedLikes = async (prisma: PrismaClient, context: SeedContext): Promise<void> => {
  await prisma.like.upsert({
    where: {
      postId_userId: {
        postId: context.postId,
        userId: context.regularUserId,
      },
    },
    update: { isActive: true },
    create: {
      postId: context.postId,
      userId: context.regularUserId,
      isActive: true,
    },
  })
}
