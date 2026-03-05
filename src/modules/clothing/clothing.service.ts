import { PrismaClient } from "@prisma/client";
import type { CreateClothingItemDTO } from "./clothing.dto";
import { CloudinaryService } from "@common/utils/cloudinary.util";
import { AppError } from "@common/errors/app-error";
import { MESSAGES } from "@common/constants/messages.constant";
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
            MESSAGES.CLOTHING_CATEGORY_NOT_FOUND,
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

    async listCategories(userId: number, search?: string) {
      return this.prisma.category.findMany({
        where: {
          userId,
          name: search ? { contains: search, mode: "insensitive" } : undefined,
        },
        orderBy: {
          name: "asc",
        },
      });
    }

    async listTags(userId: number, search?: string) {
      return this.prisma.tag.findMany({
        where: {
          userId,
          name: search ? { contains: search, mode: "insensitive" } : undefined,
        },
        orderBy: {
          name: "asc",
        },
      });
    }

    async deleteClothingItem(userId: number, itemId: number) {
      const existing = await this.prisma.clothingItem.findFirst({
        where: {
          id: itemId,
          userId,
        },
        select: { id: true, image: true },
      });

      if (!existing) {
        throw new AppError(MESSAGES.CLOTHING_ITEM_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
      }

      await this.cloudinaryService.deleteFileByUrl(existing.image);

      await this.prisma.$transaction([
        this.prisma.clothingItemTag.deleteMany({
          where: { clothingItemId: itemId },
        }),
        this.prisma.outfitItem.deleteMany({
          where: { clothingItemId: itemId },
        }),
        this.prisma.clothingItem.delete({
          where: { id: itemId },
        }),
      ]);

      return { id: itemId };
    }
}
