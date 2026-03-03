import { PrismaClient } from "@prisma/client";
import type { CreateClothingItemDTO, UpdateClothingItemDTO } from "./clothing.dto";
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

  async updateClothingItem(
    userId: number,
    itemId: number,
    data: UpdateClothingItemDTO,
    file?: Express.Multer.File,
  ) {
    const existing = await this.prisma.clothingItem.findFirst({
      where: {
        id: itemId,
        userId,
      },
    });

    if (!existing) {
      throw new AppError(
        "Clothing item not found",
        404,
        ErrorCode.NOT_FOUND,
      );
    }

    // Validate category nếu có update
    if (data.categoryId !== undefined) {
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

    let imageUrl: string | undefined;

    if (file) {
      // Xóa ảnh cũ nếu tồn tại
      if (existing.image) {
        await this.cloudinaryService.deleteFileByUrl(existing.image);
      }

      imageUrl = await this.cloudinaryService.uploadFile(file);
    }

    // Build object chỉ chứa field có giá trị
    const updateData: any = {};

    for (const key in data) {
      const value = data[key as keyof UpdateClothingItemDTO];
      if (value !== undefined) {
        updateData[key] = value;
      }
    }

    if (imageUrl !== undefined) {
      updateData.image = imageUrl;
    }

    return this.prisma.clothingItem.update({
      where: { id: itemId },
      data: updateData,
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
      throw new AppError("Clothing item not found", 404, ErrorCode.NOT_FOUND);
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
