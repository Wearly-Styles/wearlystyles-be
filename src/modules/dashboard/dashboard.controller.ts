import type { Request, Response, NextFunction } from "express"
import { SuccessResponse } from "@common/responses/success.response"
import { MESSAGES } from "@common/constants/messages.constant"
import { DashboardService } from "./dashboard.service"

export class DashboardController {
  private dashboardService = new DashboardService()

  async getMetrics(req: Request, res: Response, next: NextFunction) {
    try {
      const days = req.query.days ? Number(req.query.days) : undefined
      const result = await this.dashboardService.getMetrics(days ?? 7)
      res.json(new SuccessResponse(MESSAGES.DASHBOARD_METRICS_RETRIEVED, result))
    } catch (error) {
      next(error)
    }
  }
}
