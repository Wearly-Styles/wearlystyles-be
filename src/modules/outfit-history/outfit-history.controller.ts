import type { NextFunction, Request, Response } from "express"
import { SuccessResponse } from "@common/responses/success.response"
import { AppError } from "@common/errors/app-error"
import { ErrorCode } from "@common/enums/error-code.enum"
import { MESSAGES } from "@common/constants/messages.constant"
import { OutfitHistoryService } from "./outfit-history.service"
import type { CreateOutfitHistoryDTO, OutfitHistoryQueryDTO } from "./outfit-history.dto"

export class OutfitHistoryController {
  private outfitHistoryService = new OutfitHistoryService()

  async wearToday(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError(MESSAGES.AUTH_UNAUTHORIZED, 401, ErrorCode.UNAUTHORIZED)
      }

      const data = req.body as CreateOutfitHistoryDTO
      const result = await this.outfitHistoryService.wearToday(req.user.id, data)
      res.status(201).json(new SuccessResponse(MESSAGES.OUTFIT_HISTORY_CREATED, result, 201))
    } catch (error) {
      next(error)
    }
  }

  async listHistories(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError(MESSAGES.AUTH_UNAUTHORIZED, 401, ErrorCode.UNAUTHORIZED)
      }

      const query: OutfitHistoryQueryDTO = {
        from: req.query.from ? String(req.query.from) : undefined,
        to: req.query.to ? String(req.query.to) : undefined,
      }

      const result = await this.outfitHistoryService.listHistories(req.user.id, query)
      res.status(200).json(new SuccessResponse(MESSAGES.OUTFIT_HISTORIES_RETRIEVED, result, 200))
    } catch (error) {
      next(error)
    }
  }
}
