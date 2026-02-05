import type { Request, Response, NextFunction } from "express"
import { OutfitService } from "./outfit.service"
import { SuccessResponse } from "@common/responses/success.response"
import { AppError } from "@common/errors/app-error"
import { ErrorCode } from "@common/enums/error-code.enum"
import type { CreateOutfitDTO } from "./outfit.dto"

export class OutfitController {
  private outfitService = new OutfitService()

  async createOutfit(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError("Unauthorized", 401, ErrorCode.UNAUTHORIZED)
      }

      const data = req.body as CreateOutfitDTO
      const result = await this.outfitService.createOutfit(req.user.id, data)
      res.status(201).json(new SuccessResponse("Outfit created", result, 201))
    } catch (error) {
      next(error)
    }
  }
}
