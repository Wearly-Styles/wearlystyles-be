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

  async getClothingItemById(itemId: number, userId: number) {

    const checkItem = await this.prisma.clothingItem.findUnique({
      where: { id: itemId }
    });

    const item = await this.prisma.clothingItem.findFirst({
      where: {
        id: itemId,
        userId: userId,
      },
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
    });

    if (!item) {
      throw new AppError("Clothing item not found", 404, ErrorCode.NOT_FOUND);
    }

    return item;
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
      if (existing.image) {
        await this.cloudinaryService.deleteFileByUrl(existing.image);
      }
      imageUrl = await this.cloudinaryService.uploadFile(file);
    }

    const updateData: any = {
      name: data.name,
      color: data.color,
      material: data.material,
      description: data.description,
      season: data.season,
      isFavorite: data.isFavorite !== undefined ?
        (String(data.isFavorite) === 'true') : undefined,
      categoryId: data.categoryId,
    };

    Object.keys(updateData).forEach(key =>
      updateData[key] === undefined && delete updateData[key]
    );

    if (imageUrl) {
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
