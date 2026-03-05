import type { Request, Response, NextFunction } from "express"
import { ContextService } from "./context.service"
import { SuccessResponse } from "@common/responses/success.response"
import type { CalendarQueryDTO, WeatherQueryDTO } from "./context.dto"
import { AppError } from "@common/errors/app-error"
import { ErrorCode } from "@common/enums/error-code.enum"
import { MESSAGES } from "@common/constants/messages.constant"

export class ContextController {
  private contextService = new ContextService()

  async getWeather(req: Request, res: Response, next: NextFunction) {
    try {
      const query: WeatherQueryDTO = {
        lat: Number(req.query.lat),
        lon: Number(req.query.lon),
        datetime: req.query.datetime ? String(req.query.datetime) : undefined,
      }

      const result = await this.contextService.getWeatherContext(query)
      res.json(new SuccessResponse(MESSAGES.CONTEXT_WEATHER_RETRIEVED, result))
    } catch (error) {
      next(error)
    }
  }

  async getCalendar(req: Request, res: Response, next: NextFunction) {
    try {
      const data: CalendarQueryDTO = req.body
      const result = await this.contextService.getCalendarContext(data)
      res.json(new SuccessResponse(MESSAGES.CONTEXT_CALENDAR_RETRIEVED, result))
    } catch (error) {
      next(error)
    }
  }

  async getCloset(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError(MESSAGES.AUTH_UNAUTHORIZED, 401, ErrorCode.UNAUTHORIZED)
      }
      const result = await this.contextService.getClosetContext(req.user.id)
      res.json(new SuccessResponse(MESSAGES.CONTEXT_CLOSET_RETRIEVED, result))
    } catch (error) {
      next(error)
    }
  }
}
