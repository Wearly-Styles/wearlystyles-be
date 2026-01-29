import { PrismaClient } from "@prisma/client";
import type { CreateClothingItemDTO } from "./clothing.dto";
import { CloudinaryService } from "@common/utils/cloudinary.util";
import { AppError } from "@common/errors/app-error";
import { ErrorCode } from "@common/enums/error-code.enum";

export class ClothingService {
  private prisma = new PrismaClient();
  private cloudinaryService = new CloudinaryService();

    async createClothingItem(
      userId: number,
      data: CreateClothingItemDTO,
      file: Express.Multer.File,
    ) {
      
      const imageUrl = await this.cloudinaryService.uploadFile(file);
      if (data.categoryId) {
        const category = await this.prisma.category.findFirst({
          where: {
            id: data.categoryId,
            userId,
          },
        });

        if (!category) {
          throw new AppError(
            "Category not found or does not belong to user",
            400,
            ErrorCode.BAD_REQUEST,
          );
        }
      }

      return this.prisma.clothingItem.create({
        data: {
          userId,
          categoryId: data.categoryId,
          image: imageUrl,
          ...data,
        },
      });
    }

  async createCategory(userId: number, data: { name: string }) {
    return this.prisma.category.create({
      data: {
        userId,
        ...data,
      },
    });
  }

  async createTag(userId: number, data: { name: string }) {
    return this.prisma.tag.create({
      data: {
        userId, 
        ...data,
      },
    });
  }
}
