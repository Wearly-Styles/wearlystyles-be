import type { Request, Response, NextFunction } from "express"
import { OutfitPlanService } from "./outfit-plan.service"
import { SuccessResponse } from "@common/responses/success.response"
import { AppError } from "@common/errors/app-error"
import { ErrorCode } from "@common/enums/error-code.enum"
import { MESSAGES } from "@common/constants/messages.constant"
import type { OutfitPlanItemDTO, OutfitPlanQueryDTO, UpdateOutfitPlanDTO } from "./outfit-plan.dto"

export class OutfitPlanController {
  private outfitPlanService = new OutfitPlanService()

  async createPlans(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError(MESSAGES.AUTH_UNAUTHORIZED, 401, ErrorCode.UNAUTHORIZED)
      }

      const items = (req.body.items || []) as OutfitPlanItemDTO[]
      const result = await this.outfitPlanService.createPlans(req.user.id, items)
      res.status(201).json(new SuccessResponse(MESSAGES.OUTFIT_PLANS_CREATED, result, 201))
    } catch (error) {
      next(error)
    }
  }

  async listPlans(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError(MESSAGES.AUTH_UNAUTHORIZED, 401, ErrorCode.UNAUTHORIZED)
      }

      const query: OutfitPlanQueryDTO = {
        from: req.query.from ? String(req.query.from) : undefined,
        to: req.query.to ? String(req.query.to) : undefined,
      }

      const result = await this.outfitPlanService.listPlans(req.user.id, query)
      res.json(new SuccessResponse(MESSAGES.OUTFIT_PLANS_RETRIEVED, result))
    } catch (error) {
      next(error)
    }
  }

  async updatePlan(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError(MESSAGES.AUTH_UNAUTHORIZED, 401, ErrorCode.UNAUTHORIZED)
      }

      const id = Number(req.params.id)
      if (!Number.isFinite(id)) {
        throw new AppError(MESSAGES.OUTFIT_PLAN_ID_INVALID, 400, ErrorCode.BAD_REQUEST)
      }

      const data = req.body as UpdateOutfitPlanDTO
      const result = await this.outfitPlanService.updatePlan(req.user.id, id, data)
      res.json(new SuccessResponse(MESSAGES.OUTFIT_PLAN_UPDATED, result))
    } catch (error) {
      next(error)
    }
  }

  async deletePlan(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError(MESSAGES.AUTH_UNAUTHORIZED, 401, ErrorCode.UNAUTHORIZED)
      }

      const id = Number(req.params.id)
      if (!Number.isFinite(id)) {
        throw new AppError(MESSAGES.OUTFIT_PLAN_ID_INVALID, 400, ErrorCode.BAD_REQUEST)
      }

      const result = await this.outfitPlanService.deletePlan(req.user.id, id)
      res.json(new SuccessResponse(MESSAGES.OUTFIT_PLAN_DELETED, result))
    } catch (error) {
      next(error)
    }
  }
}
