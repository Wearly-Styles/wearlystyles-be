import type { PrismaClient } from "@prisma/client"
import type { SeedContext } from "./seed.types"

export const seedPosts = async (prisma: PrismaClient, context: SeedContext): Promise<Pick<SeedContext, "postId">> => {
  const post =
    (await prisma.post.findFirst({
      where: { userId: context.adminUserId, caption: "First outfit post" },
    })) ??
    (await prisma.post.create({
      data: {
        userId: context.adminUserId,
        image: "https://example.com/posts/office-smart.png",
        caption: "First outfit post",
        status: "published",
      },
    }))

  return { postId: post.id }
}
