import type { Request, Response, NextFunction } from "express";
import { ClothingService } from "./clothing.service";
import { SuccessResponse } from "@common/responses/success.response";
import { AppError } from "@common/errors/app-error";
import { MESSAGES } from "@common/constants/messages.constant";
import { ErrorCode } from "@common/enums/error-code.enum";
import { CreateCategoryDTO, CreateClothingItemDTO, UpdateClothingItemDTO } from "./clothing.dto";
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

  async createCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user as RequestUser;
      const data = CreateCategoryDTO.parse(req.body);

      const result = await this.clothingService.createCategory(
        user.id,
        data,
      );

      res
        .status(201)
        .json(
          new SuccessResponse("Category created successfully", result, 201),
        );
    } catch (error) {
      next(error);
    }
  }

  async createTag(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user as RequestUser;
      const data = req.body;
      const result = await this.clothingService.createTag(
        user.id,
        data,
      );
      res
        .status(201)
        .json(
          new SuccessResponse("Tag created successfully", result, 201),
        );
    } catch (error) {
      next(error);
    }
  }

  async listCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user as RequestUser;
      const { search } = req.query as { search?: string };
      const result = await this.clothingService.listCategories(
        user.id,
        search,
      );
      res
        .status(200)
        .json(
          new SuccessResponse("Categories retrieved successfully", result, 200),
        );
    } catch (error) {
      next(error);
    }
  }

  async listTags(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user as RequestUser;
      const { search } = req.query as { search?: string };
      const result = await this.clothingService.listTags(
        user.id,
        search,
      );
      res
        .status(200)
        .json(
          new SuccessResponse("Tags retrieved successfully", result, 200),
        );
    } catch (error) {
      next(error);
    }
  }

  async updateClothingItem(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const user = req.user as RequestUser;
      const itemId = Number(req.params.id);

      if (!Number.isFinite(itemId)) {
        throw new AppError(
          "Invalid item id",
          400,
          ErrorCode.BAD_REQUEST,
        );
      }

      const data = UpdateClothingItemDTO.parse(req.body);
      const file = req.file;

      // Không cho update rỗng
      if (!file && Object.keys(data).length === 0) {
        throw new AppError(
          "No data provided for update",
          400,
          ErrorCode.BAD_REQUEST,
        );
      }

      const result = await this.clothingService.updateClothingItem(
        user.id,
        itemId,
        data,
        file,
      );

      res.status(200).json(
        new SuccessResponse(
          "Clothing item updated successfully",
          result,
          200,
        ),
      );
    } catch (error) {
      next(error);
    }
  }

  async deleteClothingItem(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user as RequestUser;
      const itemId = Number(req.params.id);

      if (!Number.isFinite(itemId)) {
        throw new AppError("Invalid item id", 400, ErrorCode.BAD_REQUEST);
      }

      const result = await this.clothingService.deleteClothingItem(user.id, itemId);
      res.status(200).json(new SuccessResponse("Clothing item deleted successfully", result, 200));
    } catch (error) {
      next(error);
    }
  }
}
