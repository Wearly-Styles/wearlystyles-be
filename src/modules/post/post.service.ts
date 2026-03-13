import { PrismaClient } from "@prisma/client";
import { AppError } from "@common/errors/app-error";
import { ErrorCode } from "@common/enums/error-code.enum";
import {
  AllPostDTO,
  UserPostDTO,
  CreatePostInput,
  UpdatePostInput,
  DeletePostDTO,
} from "./post.dto";
import { CloudinaryService } from "@common/utils/cloudinary.util";

export class PostService {
  private prisma = new PrismaClient();
  private cloudinaryService = new CloudinaryService();

  async getAllPosts(currentUserId: number) {
    try {
      const posts = await this.prisma.post.findMany({
        include: {
          user: {
            include: {
              profile: true,
            },
          },

          comments: {
            include: {
              user: {
                include: {
                  profile: true,
                },
              },
            },
          },

          likes: true,
        },

        orderBy: {
          id: "desc",
        },
      });

      return posts.map((post) => {
        const activeLikes = post.likes.filter((l) => l.isActive);

        return AllPostDTO.parse({
          id: post.id,

          userId: post.userId ?? 0,

          user: {
            id: post.user?.id ?? 0,
            name: post.user?.profile?.fullName ?? "Unknown",
            avatar: post.user?.profile?.avatar ?? null,
          },

          image: post.image,

          status: post.status ?? null,
          caption: post.caption ?? null,

          createdAt: post.createdAt ?? null,
          updatedAt: post.updatedAt ?? null,

          likes: activeLikes.length,

          liked: activeLikes.some((like) => like.userId === currentUserId),

          comments: post.comments.map((comment) => ({
            id: comment.id,

            content: comment.content ?? null,

            createdAt: comment.createdAt ?? null,
            updatedAt: comment.updatedAt ?? null,

            user: {
              id: comment.user?.id ?? 0,
              name: comment.user?.profile?.fullName ?? "Unknown",
              avatar: comment.user?.profile?.avatar ?? null,
            },
          })),
        });
      });
    } catch (error) {
      throw error;
    }
  }

  async getPostsByUserId(userId: number, currentUserId: number) {
    const posts = await this.prisma.post.findMany({
      where: { userId },
      include: {
        user: {
          include: {
            profile: true,
          },
        },
        comments: {
          include: {
            user: {
              include: {
                profile: true,
              },
            },
          },
        },
        likes: true,
      },
    });
    return posts.map((post) => {
      const activeLikes = post.likes.filter((l) => l.isActive);
      const status = post.status ?? "";
      const caption = post.caption ?? "";

      return UserPostDTO.parse({
        id: post.id,
        userId: post.userId,
        user: {
          id: post.user?.id ?? 0,
          name: post.user?.profile?.fullName ?? "Unknown",
          avatar: post.user?.profile?.avatar ?? null,
        },
        image: post.image,
        name: post.user?.profile?.fullName ?? "Unknown",
        status,
        caption,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        likes: post.likes.length,
        liked: activeLikes.some((like) => like.userId === currentUserId),

        comments: post.comments.map((comment) => ({
          id: comment.id,
          content: comment.content,
          createdAt: comment.createdAt,
          updatedAt: comment.updatedAt,
          user: {
            id: comment.user?.id ?? 0,
            name: comment.user?.profile?.fullName ?? "Unknown",
            avatar: comment.user?.profile?.avatar ?? null,
          },
        })),
      });
    });
  }

  async createPost(
    userId: number,
    data: CreatePostInput,
    file?: Express.Multer.File,
  ) {
    let imageUrl: string | null = null;

    if (file) {
      imageUrl = await this.cloudinaryService.uploadFile(file);
    }

    // create the post and eager‑load the user/profile so we can return the name
    const post = await this.prisma.post.create({
      data: {
        userId,
        status: data.status,
        caption: data.caption,
        image: imageUrl,
      },
      include: {
        user: {
          include: {
            profile: true,
          },
        },
      },
    });

    // name is required by UserPostDTO, default to "Unknown" if something is missing
    const name = post.user?.profile?.fullName ?? "Unknown";

    return UserPostDTO.parse({
      id: post.id,
      userId: post.userId,
      user: {
        id: post.user?.id ?? 0,
        name,
        avatar: post.user?.profile?.avatar ?? null,
      },
      image: post.image,
      status: post.status ?? null,
      caption: post.caption ?? null,
      createdAt: post.createdAt ?? null,
      updatedAt: post.updatedAt ?? null,
      likes: 0,
      liked: false,
      comments: [],
    });
  }

  async updatePost(
    postId: number,
    userId: number,
    data: UpdatePostInput,
    file?: Express.Multer.File,
  ) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new AppError("Post not found", 404, ErrorCode.NOT_FOUND);
    }

    if (post.userId !== userId) {
      throw new AppError("Unauthorized", 403, ErrorCode.FORBIDDEN);
    }

    let imageUrl = post.image;

    if (file) {
      imageUrl = await this.cloudinaryService.uploadFile(file);
    }

    const updatedPost = await this.prisma.post.update({
      where: { id: postId },
      data: {
        ...(data.status !== undefined && { status: data.status }),
        ...(data.caption !== undefined && { caption: data.caption }),
        ...(file && { image: imageUrl }),
      },
      include: {
        comments: true,
        likes: true,
      },
    });

    return UserPostDTO.parse({
      ...updatedPost,
      likes: updatedPost.likes.length,
    });
  }

  async deletePost(postId: number, userId: number) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new AppError("Post not found", 404, ErrorCode.NOT_FOUND);
    }

    if (post.userId !== userId) {
      throw new AppError("Unauthorized", 403, ErrorCode.FORBIDDEN);
    }

    await this.prisma.post.delete({
      where: { id: postId },
    });

    return { id: postId };
  }

  async toggleLike(postId: number, userId: number) {
    // Check if post exists
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new AppError("Post not found", 404, ErrorCode.NOT_FOUND);
    }

    // Find existing like
    const existingLike = await this.prisma.like.findUnique({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
    });

    let isActive: boolean;
    if (existingLike) {
      // Toggle isActive
      isActive = !existingLike.isActive;
      await this.prisma.like.update({
        where: {
          postId_userId: {
            postId,
            userId,
          },
        },
        data: {
          isActive,
        },
      });
    } else {
      // Create new like as active
      isActive = true;
      await this.prisma.like.create({
        data: {
          postId,
          userId,
          isActive,
        },
      });
    }

    // Count active likes
    const activeLikesCount = await this.prisma.like.count({
      where: {
        postId,
        isActive: true,
      },
    });

    return {
      postId,
      liked: isActive,
      likesCount: activeLikesCount,
    };
  }

  async commentOnPost(postId: number, userId: number, content: string) {
    // Check if post exists
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new AppError("Post not found", 404, ErrorCode.NOT_FOUND);
    }

    const comment = await this.prisma.comment.create({
      data: {
        postId,
        userId,
        content,
      },
    });

    return {
      id: comment.id,
      content: comment.content,
      createdAt: new Date(),
      updatedAt: comment.updatedAt,
    };
  }
}
