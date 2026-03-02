import { PrismaClient } from "@prisma/client";
import {
  ListClothingItemDTO,
  type CreateClothingItemDTO,
} from "./clothing.dto";
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

  async listClothingItems(userId: number, query: unknown) {
    const dto = ListClothingItemDTO.parse(query);

    const {
      page,
      limit,
      name,
      categoryId,
      color,
      isFavorite,
      season,
      material,
    } = dto;

    const where: any = { userId };

    if (name) {
      where.name = { contains: name, mode: "insensitive" };
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (color) {
      where.color = { contains: color, mode: "insensitive" };
    }

    if (typeof isFavorite === "boolean") {
      where.isFavorite = isFavorite;
    }

    if (season) {
      where.season = season;
    }

    if (material) {
      where.material = material;
    }

    const [items, total] = await Promise.all([
      this.prisma.clothingItem.findMany({
        where,
        include: {
          category: true,
          tags: {
            include: {
              tag: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.clothingItem.count({ where }),
    ]);

    return {
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async detailClothingItem(userId: number, itemId: number) {
    const item = await this.prisma.clothingItem.findFirst({
      where: {
        id: itemId,
        userId,
      },
      include: {
        category: true,
        tags: { 
          include: {
            tag: true,
          },
        },
      },
    });
    if (!item) {
      throw new AppError(
        "Clothing item not found or does not belong to user",
        404,
        ErrorCode.NOT_FOUND,
      );
    } 
    return item;
  }

  async updateClothingItemCategory(
    userId: number,
    itemId: number,
    categoryId: number,
  ) {
    const item = await this.prisma.clothingItem.findFirst({
      where: {
        id: itemId,
        userId,
      },
    });
    if (!item) {
      throw new AppError(
        "Clothing item not found or does not belong to user",
        404,
        ErrorCode.NOT_FOUND,
      );
    }
    if (categoryId) {
      const category = await this.prisma.category.findFirst({
        where: {
          id: categoryId,
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

    return this.prisma.clothingItem.update({
      where: {
        id: itemId,
      },
      data: {
        categoryId,
      },
    });
  }
}
