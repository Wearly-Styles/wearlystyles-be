import type { Request, Response, NextFunction } from "express"
import { OutfitService } from "./outfit.service"
import { SuccessResponse } from "@common/responses/success.response"
import { AppError } from "@common/errors/app-error"
import { ErrorCode } from "@common/enums/error-code.enum"
import { MESSAGES } from "@common/constants/messages.constant"
import type { CreateOutfitDTO, UpdateOutfitDTO } from "./outfit.dto"

export class OutfitController {
  private outfitService = new OutfitService()

  async createOutfit(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError(MESSAGES.AUTH_UNAUTHORIZED, 401, ErrorCode.UNAUTHORIZED)
      }

      const data = req.body as CreateOutfitDTO
      const result = await this.outfitService.createOutfit(req.user.id, data)
      res.status(201).json(new SuccessResponse(MESSAGES.OUTFIT_CREATED, result, 201))
    } catch (error) {
      next(error)
    }
  }

  async listOutfits(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError(MESSAGES.AUTH_UNAUTHORIZED, 401, ErrorCode.UNAUTHORIZED)
      }

      const result = await this.outfitService.listOutfits(req.user.id)
      res.status(200).json(new SuccessResponse(MESSAGES.OUTFITS_RETRIEVED, result, 200))
    } catch (error) {
      next(error)
    }
  }

  async countOutfits(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError(MESSAGES.AUTH_UNAUTHORIZED, 401, ErrorCode.UNAUTHORIZED)
      }

      const result = await this.outfitService.countOutfits(req.user.id)
      res.status(200).json(new SuccessResponse(MESSAGES.OUTFIT_COUNT_RETRIEVED, result, 200))
    } catch (error) {
      next(error)
    }
  }

  async getOutfitById(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError(MESSAGES.AUTH_UNAUTHORIZED, 401, ErrorCode.UNAUTHORIZED)
      }

      const id = Number(req.params.id)
      if (!Number.isInteger(id) || id <= 0) {
        throw new AppError(MESSAGES.OUTFIT_ID_INVALID, 400, ErrorCode.BAD_REQUEST)
      }

      const result = await this.outfitService.getOutfitById(req.user.id, id)
      res.status(200).json(new SuccessResponse(MESSAGES.OUTFIT_RETRIEVED, result, 200))
    } catch (error) {
      next(error)
    }
  }

  async updateOutfit(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError(MESSAGES.AUTH_UNAUTHORIZED, 401, ErrorCode.UNAUTHORIZED)
      }

      const id = Number(req.params.id)
      if (!Number.isInteger(id) || id <= 0) {
        throw new AppError(MESSAGES.OUTFIT_ID_INVALID, 400, ErrorCode.BAD_REQUEST)
      }

      const data = req.body as UpdateOutfitDTO
      const result = await this.outfitService.updateOutfit(req.user.id, id, data)
      res.status(200).json(new SuccessResponse(MESSAGES.OUTFIT_UPDATED, result, 200))
    } catch (error) {
      next(error)
    }
  }

  async deleteOutfit(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError(MESSAGES.AUTH_UNAUTHORIZED, 401, ErrorCode.UNAUTHORIZED)
      }

      const id = Number(req.params.id)
      if (!Number.isInteger(id) || id <= 0) {
        throw new AppError(MESSAGES.OUTFIT_ID_INVALID, 400, ErrorCode.BAD_REQUEST)
      }

      const result = await this.outfitService.deleteOutfit(req.user.id, id)
      res.status(200).json(new SuccessResponse(MESSAGES.OUTFIT_DELETED, result, 200))
    } catch (error) {
      next(error)
    }
  }
}
