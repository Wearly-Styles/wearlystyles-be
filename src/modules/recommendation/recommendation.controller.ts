import type { Request, Response, NextFunction } from "express"
import { RecommendationService } from "./recommendation.service"
import { SuccessResponse } from "@common/responses/success.response"
import type { RecommendationContextDTO, RecommendationPriorOutfit } from "./recommendation.dto"
import { ContextService } from "@modules/context/context.service"
import type { CalendarQueryDTO, NormalizedEvent, WeatherQueryDTO } from "@modules/context/context.dto"
import { AppError } from "@common/errors/app-error"
import { ErrorCode } from "@common/enums/error-code.enum"
import { MESSAGES } from "@common/constants/messages.constant"
import { prisma } from "@modules/prisma"

const RECENT_OUTFIT_LOOKBACK_DAYS = 14
const RECENT_OUTFIT_LOOKAHEAD_DAYS = 30
const MAX_RECENT_OUTFITS = 12

type OutfitWithItems = {
  id: number
  name: string | null
  occasion: string | null
  items: Array<{ clothingItemId: number }>
}

export class RecommendationController {
  private recommendationService = new RecommendationService()
  private contextService = new ContextService()

  private isValidDate(value?: string | null): value is string {
    return typeof value === "string" && value.length > 0 && !Number.isNaN(new Date(value).getTime())
  }

  private startOfDay(value: Date): Date {
    const date = new Date(value)
    date.setHours(0, 0, 0, 0)
    return date
  }

  private endOfDay(value: Date): Date {
    const date = new Date(value)
    date.setHours(23, 59, 59, 999)
    return date
  }

  private extractTargetDates(planDate?: string, calendar?: NormalizedEvent[]): Date[] {
    const dates: Date[] = []
    if (this.isValidDate(planDate)) {
      dates.push(new Date(planDate))
    }

    for (const event of calendar || []) {
      const candidate = event.start || event.end
      if (this.isValidDate(candidate)) {
        dates.push(new Date(candidate))
      }
    }

    if (dates.length === 0) {
      dates.push(new Date())
    }

    return dates.sort((a, b) => a.getTime() - b.getTime())
  }

  private buildRecentOutfitEntry(
    source: RecommendationPriorOutfit["source"],
    date: Date | null | undefined,
    outfit: OutfitWithItems | null | undefined,
  ): RecommendationPriorOutfit | null {
    if (!date || !outfit) {
      return null
    }

    const itemIds = Array.from(
      new Set(
        (outfit.items || [])
          .map((item) => Number(item.clothingItemId))
          .filter((itemId) => Number.isFinite(itemId)),
      ),
    )

    if (itemIds.length === 0) {
      return null
    }

    return {
      source,
      date: date.toISOString(),
      outfitId: outfit.id,
      outfitName: outfit.name || undefined,
      eventType: outfit.occasion || undefined,
      itemIds,
    }
  }

  private async loadRecentOutfits(
    userId: number,
    planDate?: string,
    calendar?: NormalizedEvent[],
  ): Promise<RecommendationPriorOutfit[]> {
    const targetDates = this.extractTargetDates(planDate, calendar)
    const anchorTime = targetDates[0].getTime()
    const rangeStart = this.startOfDay(targetDates[0])
    rangeStart.setDate(rangeStart.getDate() - RECENT_OUTFIT_LOOKBACK_DAYS)

    const rangeEnd = this.endOfDay(targetDates[targetDates.length - 1])
    rangeEnd.setDate(rangeEnd.getDate() + RECENT_OUTFIT_LOOKAHEAD_DAYS)

    const [plannedOutfits, wornOutfits] = await Promise.all([
      prisma.outfitPlan.findMany({
        where: {
          userId,
          planDate: {
            gte: rangeStart,
            lte: rangeEnd,
          },
        },
        orderBy: {
          planDate: "asc",
        },
        include: {
          outfit: {
            select: {
              id: true,
              name: true,
              occasion: true,
              items: {
                select: {
                  clothingItemId: true,
                },
              },
            },
          },
        },
      }),
      prisma.outfitHistory.findMany({
        where: {
          userId,
          wornDate: {
            gte: rangeStart,
            lte: rangeEnd,
          },
        },
        orderBy: {
          wornDate: "desc",
        },
        include: {
          outfit: {
            select: {
              id: true,
              name: true,
              occasion: true,
              items: {
                select: {
                  clothingItemId: true,
                },
              },
            },
          },
        },
      }),
    ])

    const combined = [
      ...plannedOutfits.map((plan) => this.buildRecentOutfitEntry("plan", plan.planDate, plan.outfit)),
      ...wornOutfits.map((history) => this.buildRecentOutfitEntry("history", history.wornDate, history.outfit)),
    ]
      .filter((entry): entry is RecommendationPriorOutfit => Boolean(entry))
      .sort((a, b) => {
        const diffA = Math.abs(new Date(a.date).getTime() - anchorTime)
        const diffB = Math.abs(new Date(b.date).getTime() - anchorTime)
        return diffA - diffB
      })

    const recentOutfits: RecommendationPriorOutfit[] = []
    const seen = new Set<string>()
    for (const outfit of combined) {
      const signature = outfit.itemIds.slice().sort((a, b) => a - b).join(",")
      if (seen.has(signature)) {
        continue
      }

      seen.add(signature)
      recentOutfits.push(outfit)
      if (recentOutfits.length >= MAX_RECENT_OUTFITS) {
        break
      }
    }

    return recentOutfits
  }

  private mergeRecentOutfits(
    storedOutfits: RecommendationPriorOutfit[],
    providedOutfits?: RecommendationPriorOutfit[],
  ): RecommendationPriorOutfit[] {
    const merged: RecommendationPriorOutfit[] = []
    const seen = new Set<string>()

    for (const outfit of [...(providedOutfits || []), ...storedOutfits]) {
      if (!this.isValidDate(outfit?.date)) {
        continue
      }

      const itemIds = Array.from(
        new Set(
          (outfit.itemIds || [])
            .map((itemId) => Number(itemId))
            .filter((itemId) => Number.isFinite(itemId)),
        ),
      )

      if (itemIds.length === 0) {
        continue
      }

      const normalizedDate = new Date(outfit.date).toISOString()
      const signature = itemIds.slice().sort((a, b) => a - b).join(",")
      if (seen.has(signature)) {
        continue
      }

      seen.add(signature)
      merged.push({
        ...outfit,
        date: normalizedDate,
        itemIds,
      })

      if (merged.length >= MAX_RECENT_OUTFITS) {
        break
      }
    }

    return merged
  }

  async recommendByContext(req: Request, res: Response, next: NextFunction) {
    try {
      const body = req.body as RecommendationContextDTO & {
        weatherQuery?: WeatherQueryDTO
        calendarQuery?: CalendarQueryDTO
      }

      if (!req.user) {
        throw new AppError(MESSAGES.AUTH_UNAUTHORIZED, 401, ErrorCode.UNAUTHORIZED)
      }

      let {
        weather,
        calendar,
        closet,
        preferences,
        planDate,
        recentOutfits: providedRecentOutfits,
        includeAlternatives,
        alternativesCount,
      } = body

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

      const storedRecentOutfits = await this.loadRecentOutfits(req.user.id, planDate, calendar)
      const recentOutfits = this.mergeRecentOutfits(storedRecentOutfits, providedRecentOutfits)

      const context: RecommendationContextDTO = {
        weather,
        calendar,
        closet,
        preferences,
        planDate,
        recentOutfits,
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

      let {
        weather,
        calendar,
        closet,
        preferences,
        planDate,
        recentOutfits: providedRecentOutfits,
        selectedEventType,
        selectedStyle,
        includeAlternatives,
        alternativesCount,
      } = body

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

      const storedRecentOutfits = await this.loadRecentOutfits(req.user.id, planDate, calendar)
      const recentOutfits = this.mergeRecentOutfits(storedRecentOutfits, providedRecentOutfits)

      const context: RecommendationContextDTO = {
        weather,
        calendar,
        closet,
        preferences,
        planDate,
        recentOutfits,
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
