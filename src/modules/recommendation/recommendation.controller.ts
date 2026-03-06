import type { Request, Response, NextFunction } from "express"
import { RecommendationService } from "./recommendation.service"
import { SuccessResponse } from "@common/responses/success.response"
import type { RecommendationContextDTO } from "./recommendation.dto"
import { ContextService } from "@modules/context/context.service"
import type { CalendarQueryDTO, WeatherQueryDTO } from "@modules/context/context.dto"
import { AppError } from "@common/errors/app-error"
import { ErrorCode } from "@common/enums/error-code.enum"
import { MESSAGES } from "@common/constants/messages.constant"

export class RecommendationController {
  private recommendationService = new RecommendationService()
  private contextService = new ContextService()

  async recommendByContext(req: Request, res: Response, next: NextFunction) {
    try {
      const body = req.body as RecommendationContextDTO & {
        weatherQuery?: WeatherQueryDTO
        calendarQuery?: CalendarQueryDTO
      }

      if (!req.user) {
        throw new AppError(MESSAGES.AUTH_UNAUTHORIZED, 401, ErrorCode.UNAUTHORIZED)
      }

      let { weather, calendar, closet, preferences, includeAlternatives, alternativesCount } = body

      if (!closet || closet.length === 0) {
        closet = await this.contextService.getClosetContext(req.user.id)
      }

      if (!weather && body.weatherQuery) {
        weather = await this.contextService.getWeatherContext(body.weatherQuery)
      }

      if (!calendar && body.calendarQuery) {
        calendar = await this.contextService.getCalendarContext(body.calendarQuery)
      }

      if (!closet || closet.length === 0) {
        throw new AppError(MESSAGES.CLOSET_ITEMS_REQUIRED, 400, ErrorCode.BAD_REQUEST)
      }

      const context: RecommendationContextDTO = {
        weather,
        calendar,
        closet,
        preferences,
        includeAlternatives,
        alternativesCount,
      }

      const result = await this.recommendationService.recommendByContext(context)
      res.json(new SuccessResponse(MESSAGES.RECOMMENDATION_GENERATED, result))
    } catch (error) {
      next(error)
    }
  }

  async recommendBySelection(req: Request, res: Response, next: NextFunction) {
    try {
      const body = req.body as RecommendationContextDTO & {
        weatherQuery?: WeatherQueryDTO
        calendarQuery?: CalendarQueryDTO
      }

      if (!req.user) {
        throw new AppError(MESSAGES.AUTH_UNAUTHORIZED, 401, ErrorCode.UNAUTHORIZED)
      }

      let { weather, calendar, closet, preferences, selectedEventType, selectedStyle, includeAlternatives, alternativesCount } = body

      if (!closet || closet.length === 0) {
        closet = await this.contextService.getClosetContext(req.user.id)
      }

      if (!weather && body.weatherQuery) {
        weather = await this.contextService.getWeatherContext(body.weatherQuery)
      }

      if (!calendar && body.calendarQuery) {
        calendar = await this.contextService.getCalendarContext(body.calendarQuery)
      }

      if (!closet || closet.length === 0) {
        throw new AppError(MESSAGES.CLOSET_ITEMS_REQUIRED, 400, ErrorCode.BAD_REQUEST)
      }

      const context: RecommendationContextDTO = {
        weather,
        calendar,
        closet,
        preferences,
        selectedEventType,
        selectedStyle,
        includeAlternatives,
        alternativesCount,
      }

      const result = await this.recommendationService.recommendBySelection(context)
      res.json(new SuccessResponse(MESSAGES.RECOMMENDATION_GENERATED, result))
    } catch (error) {
      next(error)
    }
  }
}
