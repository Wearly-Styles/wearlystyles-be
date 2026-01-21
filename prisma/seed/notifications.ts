import type { PrismaClient } from "@prisma/client"
import type { SeedContext } from "./seed.types"

export const seedNotifications = async (prisma: PrismaClient, context: SeedContext): Promise<void> => {
  await prisma.notification.create({
    data: {
      userId: context.adminUserId,
      actorId: context.regularUserId,
      type: "like",
      content: "User liked your post",
      referenceId: context.postId,
      referenceType: "post",
      isRead: false,
    },
  })
}
