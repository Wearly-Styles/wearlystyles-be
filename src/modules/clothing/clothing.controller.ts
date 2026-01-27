import type { Request, Response, NextFunction } from "express";
import { ClothingService } from "./clothing.service";
import { SuccessResponse } from "@common/responses/success.response";
import { AppError } from "@common/errors/app-error";
import { MESSAGES } from "@common/constants/messages.constant";
import { ErrorCode } from "@common/enums/error-code.enum";
import { CreateClothingItemDTO } from "./clothing.dto";
import type { RequestUser } from "@common/interfaces/request-user.interface";

export class ClothingController {
  private clothingService = new ClothingService();

  async createClothingItem(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user as RequestUser;
      const data = CreateClothingItemDTO.parse(req.body);
      const file = req.file;

      if (!file) {
        throw new AppError("Image is required", 400, ErrorCode.BAD_REQUEST);
      }

      const allowedMimes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
      ];
      if (!allowedMimes.includes(file.mimetype)) {
        throw new AppError(
          "Unsupported image format. Only JPEG, PNG, GIF, and WebP are allowed.",
          400,
          ErrorCode.BAD_REQUEST,
        );
      }

      const result = await this.clothingService.createClothingItem(
        user.id,
        data,
        file,
      );

      res
        .status(201)
        .json(
          new SuccessResponse("Clothing item added successfully", result, 201),
        );
    } catch (error) {
      next(error);
    }
  }
}
