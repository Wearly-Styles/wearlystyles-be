import type { PrismaClient } from "@prisma/client"
import type { SeedContext } from "./seed.types"

export const seedFollows = async (prisma: PrismaClient, context: SeedContext): Promise<void> => {
  await prisma.follow.upsert({
    where: {
      followerId_followingId: {
        followerId: context.regularUserId,
        followingId: context.adminUserId,
      },
    },
    update: {},
    create: {
      followerId: context.regularUserId,
      followingId: context.adminUserId,
      createdAt: new Date(),
    },
  })
}
