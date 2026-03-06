import { PrismaClient } from "@prisma/client";
import { AppError } from "@common/errors/app-error";
import { ErrorCode } from "@common/enums/error-code.enum";
import { AllPostDTO, UserPostDTO } from "./post.dto";
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
}
