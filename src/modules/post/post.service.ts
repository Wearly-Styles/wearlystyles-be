import { PrismaClient } from "@prisma/client";
import { AppError } from "@common/errors/app-error";
import { ErrorCode } from "@common/enums/error-code.enum";
import { AllPostDTO, UserPostDTO, CreatePostInput, UpdatePostInput, DeletePostDTO } from "./post.dto";
import { CloudinaryService } from "@common/utils/cloudinary.util";

export class PostService {
  private prisma = new PrismaClient();
  private cloudinaryService = new CloudinaryService();

  async getAllPosts() {
    try {
      const posts = await this.prisma.post.findMany({
        include: {
          comments: true,
          likes: true,
        },
      });
      return posts.map((post) => {
        return AllPostDTO.parse({
          id: post.id,
          userId: post.userId,
          image: post.image,
          status: post.status,
          caption: post.caption,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
          likes: post.likes.length,
          comments: post.comments.map((comment) => ({
            id: comment.id,
            content: comment.content,
            createdAt: comment.createdAt,
            updatedAt: comment.updatedAt,
          })),
        });
      });
    } catch (error) {
      throw error;
    }
  }

  async getPostsByUserId(userId: number) {
    const posts = await this.prisma.post.findMany({
      where: { userId },
      include: {
        comments: true,
        likes: true,
      },
    });
    return posts.map((post) =>
      UserPostDTO.parse({
        id: post.id,
        userId: post.userId,
        image: post.image,
        status: post.status,
        caption: post.caption,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        likes: post.likes.length,
        comments: post.comments.map((comment) => ({
          id: comment.id,
          content: comment.content,
          createdAt: comment.createdAt,
          updatedAt: comment.updatedAt,
        })),
      }),
    );
  }

  async createPost(
  userId: number,
  data: CreatePostInput,
  file?: Express.Multer.File
) {
  let imageUrl: string | null = null;

  if (file) {
    imageUrl = await this.cloudinaryService.uploadFile(file);
  }

  const post = await this.prisma.post.create({
    data: {
      userId,
      status: data.status,
      caption: data.caption,
      image: imageUrl,
    },
  });

  return UserPostDTO.parse({
    ...post,
    likes: 0,
    comments: [],
  });
}

  async updatePost(
  postId: number,
  userId: number,
  data: UpdatePostInput,
  file?: Express.Multer.File
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
}
