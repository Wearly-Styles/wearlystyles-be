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
        throw new AppError(MESSAGES.IMAGE_REQUIRED, 400, ErrorCode.BAD_REQUEST);
      }

      const allowedMimes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
      ];
      if (!allowedMimes.includes(file.mimetype)) {
        throw new AppError(
          MESSAGES.IMAGE_UNSUPPORTED,
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
          new SuccessResponse(MESSAGES.CLOTHING_ITEM_CREATED, result, 201),
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
          new SuccessResponse(MESSAGES.CLOTHING_CATEGORY_CREATED, result, 201),
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
          new SuccessResponse(MESSAGES.CLOTHING_TAG_CREATED, result, 201),
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
          new SuccessResponse(MESSAGES.CLOTHING_CATEGORIES_RETRIEVED, result, 200),
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
          new SuccessResponse(MESSAGES.CLOTHING_TAGS_RETRIEVED, result, 200),
        );
    } catch (error) {
      next(error);
    }
  }

  async getClothingItemById(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const itemId = Number(req.params.id);
      const user = req.user as { id: number };
      const userId = user.id;

      if (!Number.isFinite(itemId)) {
        throw new AppError(
          "Invalid item id",
          400,
          ErrorCode.BAD_REQUEST,
        );
      }

      const result = await this.clothingService.getClothingItemById(itemId, userId);

      res.status(200).json(
        new SuccessResponse(
          "Clothing item retrieved successfully",
          result,
          200,
        ),
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
        throw new AppError(MESSAGES.CLOTHING_ITEM_ID_INVALID, 400, ErrorCode.BAD_REQUEST);
      }

      const result = await this.clothingService.deleteClothingItem(user.id, itemId);
      res.status(200).json(new SuccessResponse(MESSAGES.CLOTHING_ITEM_DELETED, result, 200));
    } catch (error) {
      next(error);
    }
  }

  async deleteCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user as RequestUser;
      const categoryId = Number(req.params.id);

      if (!Number.isFinite(categoryId)) {
        throw new AppError("Invalid category id", 400, ErrorCode.BAD_REQUEST);
      }

      const result = await this.clothingService.deleteCategory(user.id, categoryId);

      res.status(200).json(
        new SuccessResponse(
          "Category deleted successfully. Associated items are now uncategorized.",
          result,
          200
        )
      );
    } catch (error) {
      next(error);
    }
  }
}
