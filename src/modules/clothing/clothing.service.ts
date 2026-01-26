import { PrismaClient } from "@prisma/client";
import type { CreateClothingItemDTO } from "./clothing.dto";
import { CloudinaryService } from "@common/utils/cloudinary.util";

export class ClothingService {
  private prisma = new PrismaClient();
  private cloudinaryService = new CloudinaryService();

  async createClothingItem(
    userId: number,
    data: CreateClothingItemDTO,
    file: Express.Multer.File,
  ) {
    
    const imageUrl = await this.cloudinaryService.uploadFile(file);

    return this.prisma.clothingItem.create({
      data: {
        userId,
        image: imageUrl,
        ...data,
      },
    });
  }
}
