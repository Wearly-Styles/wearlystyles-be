import config from "@config/env"
import logger from "@config/logger"
import { AppError } from "@common/errors/app-error"
import { ErrorCode } from "@common/enums/error-code.enum"
import { MESSAGES } from "@common/constants/messages.constant"
import type { RecommendationContextDTO, RecommendationResponse, OutfitRecommendation } from "./recommendation.dto"
import { getTimeOfDay, mapDressCode, mapEventType } from "@helpers/context.helper"
import { createHash } from "crypto"

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>
    }
  }>
}

class AsyncSemaphore {
  private current = 0
  private queue: Array<(release: () => void) => void> = []

  constructor(private max: number) {}

  async acquire(): Promise<() => void> {
    if (this.max <= 0) {
      return () => {}
    }

    if (this.current < this.max) {
      this.current += 1
      return () => {
        this.current = Math.max(0, this.current - 1)
        const next = this.queue.shift()
        if (next) next(() => this.release())
      }
    }

    return new Promise((resolve) => {
      this.queue.push(resolve)
    })
  }

  private release() {
    this.current = Math.max(0, this.current - 1)
    const next = this.queue.shift()
    if (next) next(() => this.release())
  }
}

class SlidingWindowRateLimiter {
  private timestamps: number[] = []

  constructor(private windowMs: number, private max: number) {}

  async acquire(): Promise<void> {
    if (this.max <= 0) return

    while (true) {
      const now = Date.now()
      this.timestamps = this.timestamps.filter((ts) => now - ts < this.windowMs)
      if (this.timestamps.length < this.max) {
        this.timestamps.push(now)
        return
      }

      const waitMs = Math.max(0, this.windowMs - (now - this.timestamps[0]))
      await new Promise((resolve) => setTimeout(resolve, waitMs))
    }
  }
}

class GeminiLimiter {
  private semaphore: AsyncSemaphore
  private rpmLimiter: SlidingWindowRateLimiter

  constructor(rpm: number, concurrency: number) {
    this.semaphore = new AsyncSemaphore(concurrency)
    this.rpmLimiter = new SlidingWindowRateLimiter(60_000, rpm)
  }

  async acquire(): Promise<() => void> {
    await this.rpmLimiter.acquire()
    return this.semaphore.acquire()
  }
}


export class RecommendationService {
  private static readonly MAX_CALENDAR_ITEMS = 5
  private static readonly MAX_TAGS_PER_ITEM = 6
  private static readonly MAX_PREFERENCES = 8
  private static readonly CHUNK_SIZE = 120
  private static readonly RETRY_LIMIT = 3
  private static readonly RETRY_BASE_MS = 700
  private static readonly MINIMIZE_CALLS = true
  private static readonly REQUEST_TIMEOUT_MS = 12000
  private static readonly GEMINI_RPM = Math.max(0, config.gemini_rpm || 0)
  private static readonly GEMINI_CONCURRENCY = Math.max(0, config.gemini_concurrency || 0)
  private static readonly CACHE_TTL_MS = Math.max(0, config.recommendation_cache_ttl_seconds || 0) * 1000
  private static readonly CACHE_MAX = Math.max(0, config.recommendation_cache_max || 0)
  private static readonly DISABLE_CACHE = Boolean(config.recommendation_disable_cache)
  private static readonly CACHE = new Map<string, { expiresAt: number; value: RecommendationResponse }>()
  private static readonly GEMINI_LIMITER = new GeminiLimiter(
    RecommendationService.GEMINI_RPM,
    RecommendationService.GEMINI_CONCURRENCY,
  )
  private static readonly OUTFIT_RESPONSE_SCHEMA = {
    type: "object",
    properties: {
      primary: {
        type: "object",
        properties: {
          eventType: { type: "string" },
          style: { type: "string" },
          items: { type: "array", items: { type: "number" }, uniqueItems: true, maxItems: 6 },
          notes: { type: "array", items: { type: "string" } },
          missingItems: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                category: { type: "string" },
                reason: { type: "string" },
              },
              required: ["name"],
            },
          },
        },
        required: ["items", "notes"],
      },
      alternatives: {
        type: "array",
        items: {
          type: "object",
          properties: {
             eventType: { type: "string" },
             style: { type: "string" },
            items: { type: "array", items: { type: "number" }, uniqueItems: true, maxItems: 6 },
             notes: { type: "array", items: { type: "string" } },
             missingItems: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  category: { type: "string" },
                  reason: { type: "string" },
                },
                required: ["name"],
              },
            },
          },
          required: ["items", "notes"],
        },
      },
    },
    required: ["primary", "alternatives"],
  }
  private static readonly BATCH_RESPONSE_SCHEMA = {
    type: "object",
    properties: {
      recommendations: {
        type: "array",
        items: {
          type: "object",
          properties: {
            eventId: { type: "string" },
            eventTitle: { type: "string" },
            eventType: { type: "string" },
            style: { type: "string" },
            items: { type: "array", items: { type: "number" }, uniqueItems: true, maxItems: 6 },
            notes: { type: "array", items: { type: "string" } },
            missingItems: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  category: { type: "string" },
                  reason: { type: "string" },
                },
                required: ["name"],
              },
            },
          },
          required: ["items", "notes"],
        },
      },
    },
    required: ["recommendations"],
  }
  private static readonly CANDIDATE_RESPONSE_SCHEMA = {
    type: "object",
    properties: {
      candidates: { type: "array", items: { type: "number" } },
    },
    required: ["candidates"],
  }
  private static readonly ITEMS_RESPONSE_SCHEMA = {
    type: "object",
    properties: {
      items: { type: "array", items: { type: "number" }, uniqueItems: true, maxItems: 6 },
    },
    required: ["items"],
  }
  private static readonly PREFILTER_THRESHOLD = 160
  private static readonly PREFILTER_LIMIT = 120
  private static readonly MAX_ALTERNATIVES = 3
  private static readonly MIN_OUTFIT_ITEMS = 3
  private static readonly MAX_OUTFIT_ITEMS = 6
  private static readonly MIN_SUITABLE_ITEMS = 3
  private static readonly SUITABLE_SCORE_THRESHOLD = 2
  private static readonly CATEGORY_LIMITS: Record<string, number> = {
    footwear: 1,
    outerwear: 1,
    onepiece: 1,
  }

  private normalizeText(value?: string | null): string {
    // Make keyword matching more robust across languages (e.g. Vietnamese diacritics).
    return (value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\u0111/g, "d")
  }

  private buildItemText(item: RecommendationContextDTO["closet"][number]): string {
    const tags = (item.tags || []).join(" ")
    return [
      item.name,
      item.category,
      item.color,
      item.season,
      item.material,
      tags,
    ]
      .map((value) => this.normalizeText(value))
      .join(" ")
  }

  private deriveSeasons(context: RecommendationContextDTO): Set<string> {
    const seasons = new Set<string>()
    const tempC = context.weather?.tempC
    const tags = context.weather?.tags || []

    if (typeof tempC === "number") {
      if (tempC <= 10) {
        seasons.add("winter")
      } else if (tempC <= 18) {
        seasons.add("fall")
        seasons.add("spring")
      } else if (tempC <= 24) {
        seasons.add("spring")
        seasons.add("summer")
      } else {
        seasons.add("summer")
      }
    }

    if (tags.includes("cold")) seasons.add("winter")
    if (tags.includes("cool")) seasons.add("fall")
    if (tags.includes("warm")) seasons.add("spring")
    if (tags.includes("hot")) seasons.add("summer")

    return seasons
  }

  private scoreClosetItem(item: RecommendationContextDTO["closet"][number], context: RecommendationContextDTO): number {
    let score = 0
    const text = this.buildItemText(item)
    const eventType = context.selectedEventType || ""
    const weatherTags = context.weather?.tags || []
    const preferredSeasons = this.deriveSeasons(context)

    if (item.isFavorite) score += 2

    if (item.season && preferredSeasons.has(this.normalizeText(item.season))) {
      score += 2
    }

    if (weatherTags.includes("rainy") || weatherTags.includes("rain_possible")) {
      if (text.includes("rain") || text.includes("waterproof")) score += 1
    }

    if (eventType === "gym") {
      if (text.includes("sport") || text.includes("active") || text.includes("athleisure")) score += 2
    } else if (eventType.startsWith("formal")) {
      if (text.includes("blazer") || text.includes("suit") || text.includes("dress") || text.includes("formal")) {
        score += 2
      }
    } else if (eventType === "travel") {
      if (text.includes("comfortable") || text.includes("sneaker") || text.includes("hoodie")) score += 1
    }

    return score
  }

  private hasFewSuitableItems(items: RecommendationContextDTO["closet"], context: RecommendationContextDTO): boolean {
    let suitableCount = 0
    for (const item of items) {
      if (this.scoreClosetItem(item, context) >= RecommendationService.SUITABLE_SCORE_THRESHOLD) {
        suitableCount += 1
        if (suitableCount >= RecommendationService.MIN_SUITABLE_ITEMS) {
          return false
        }
      }
    }
    return true
  }

  private prefilterCloset(
    items: RecommendationContextDTO["closet"],
    context: RecommendationContextDTO,
  ): RecommendationContextDTO["closet"] {
    if (items.length <= RecommendationService.PREFILTER_THRESHOLD) return items

    const ranked = items
      .map((item, index) => ({ item, index, score: this.scoreClosetItem(item, context) }))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score
        return a.index - b.index
      })
      .slice(0, RecommendationService.PREFILTER_LIMIT)
      .map((entry) => entry.item)

    if (ranked.length < Math.min(30, items.length)) {
      return items
    }

    return ranked
  }

  private getItemGroup(item: RecommendationContextDTO["closet"][number]): string | null {
    const text = this.buildItemText(item)
    const hasAny = (keywords: string[]) => keywords.some((keyword) => text.includes(keyword))

    if (
      hasAny([
        "shoe",
        "sneaker",
        "boot",
        "heel",
        "sandal",
        "loafer",
        "flat",
        "oxford",
        "trainer",
        // Vietnamese (diacritics stripped by normalizeText)
        "giay",
        "dep",
        "cao got",
      ])
    ) {
      return "footwear"
    }
    if (
      hasAny([
        "coat",
        "jacket",
        "blazer",
        "parka",
        "trench",
        "cardigan",
        "vest",
        // Vietnamese (diacritics stripped by normalizeText)
        "ao khoac",
        "khoac",
      ])
    ) {
      return "outerwear"
    }
    if (
      hasAny([
        "dress",
        "jumpsuit",
        "romper",
        // Vietnamese (diacritics stripped by normalizeText)
        "dam",
        "vay",
        "ao dai",
      ])
    ) {
      return "onepiece"
    }
    return null
  }

  private enforceCategoryLimits(
    ids: number[],
    closet: RecommendationContextDTO["closet"],
    context: RecommendationContextDTO,
  ): number[] {
    if (!ids.length) return ids

    const closetById = new Map<number, RecommendationContextDTO["closet"][number]>()
    closet.forEach((item) => closetById.set(item.id, item))

    const used: Record<string, number> = {}
    const filtered: number[] = []

    for (const id of ids) {
      const item = closetById.get(id)
      if (!item) continue
      const group = this.getItemGroup(item)
      const limit = group ? RecommendationService.CATEGORY_LIMITS[group] : undefined
      if (group && typeof limit === "number") {
        const count = used[group] || 0
        if (count >= limit) continue
        used[group] = count + 1
      }
      filtered.push(id)
    }

    if (filtered.length >= ids.length) return filtered

    const rankedCandidates = closet
      .filter((item) => !filtered.includes(item.id))
      .map((item, index) => ({ item, index, score: this.scoreClosetItem(item, context) }))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score
        return a.index - b.index
      })

    for (const candidate of rankedCandidates) {
      if (filtered.length >= ids.length) break
      const group = this.getItemGroup(candidate.item)
      const limit = group ? RecommendationService.CATEGORY_LIMITS[group] : undefined
      if (group && typeof limit === "number") {
        const count = used[group] || 0
        if (count >= limit) continue
        used[group] = count + 1
      }
      filtered.push(candidate.item.id)
    }

    return filtered
  }

  private ensureOutfitItemIds(
    ids: number[],
    closet: RecommendationContextDTO["closet"],
    context: RecommendationContextDTO,
  ): number[] {
    const closetById = new Map<number, RecommendationContextDTO["closet"][number]>()
    closet.forEach((item) => closetById.set(item.id, item))

    const uniqueIds = Array.from(new Set(ids)).filter((id) => Number.isFinite(id))
    const usedCategoryIds = new Set<number>()
    const usedGroupCounts: Record<string, number> = {}

    let result = this.enforceCategoryLimits(uniqueIds, closet, context)

    // Enforce uniqueness by DB categoryId within an outfit.
    const dedupedByCategory: number[] = []
    for (const id of result) {
      const item = closetById.get(id)
      if (!item) continue

      const categoryId = item.categoryId
      if (typeof categoryId === "number") {
        if (usedCategoryIds.has(categoryId)) continue
        usedCategoryIds.add(categoryId)
      }

      dedupedByCategory.push(id)

      const group = this.getItemGroup(item)
      if (group) {
        usedGroupCounts[group] = (usedGroupCounts[group] || 0) + 1
      }
    }
    result = dedupedByCategory

    // Gemini may return too many ids; keep response stable.
    if (result.length > RecommendationService.MAX_OUTFIT_ITEMS) {
      result = result.slice(0, RecommendationService.MAX_OUTFIT_ITEMS)
    }

    if (result.length >= RecommendationService.MIN_OUTFIT_ITEMS) return result

    const selected = new Set<number>(result)
    const rankedCandidates = closet
      .filter((item) => !selected.has(item.id))
      .map((item, index) => ({ item, index, score: this.scoreClosetItem(item, context) }))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score
        return a.index - b.index
      })

    const canAdd = (item: RecommendationContextDTO["closet"][number]) => {
      if (selected.has(item.id)) return false

      const categoryId = item.categoryId
      if (typeof categoryId === "number" && usedCategoryIds.has(categoryId)) return false

      const group = this.getItemGroup(item)
      const limit = group ? RecommendationService.CATEGORY_LIMITS[group] : undefined
      if (group && typeof limit === "number") {
        const count = usedGroupCounts[group] || 0
        if (count >= limit) return false
      }
      return true
    }

    const add = (item: RecommendationContextDTO["closet"][number]) => {
      if (!canAdd(item)) return false

      const categoryId = item.categoryId
      if (typeof categoryId === "number") {
        usedCategoryIds.add(categoryId)
      }

      const group = this.getItemGroup(item)
      const limit = group ? RecommendationService.CATEGORY_LIMITS[group] : undefined
      if (group && typeof limit === "number") {
        usedGroupCounts[group] = (usedGroupCounts[group] || 0) + 1
      }
      result.push(item.id)
      selected.add(item.id)
      return true
    }

    // Prefer adding footwear if it's missing, so the outfit is closer to "complete".
    const footwearLimit = RecommendationService.CATEGORY_LIMITS["footwear"]
    if (typeof footwearLimit === "number" && (usedGroupCounts["footwear"] || 0) < footwearLimit) {
      const footwearCandidate = rankedCandidates.find((c) => this.getItemGroup(c.item) === "footwear")
      if (footwearCandidate) {
        add(footwearCandidate.item)
      }
    }

    for (const candidate of rankedCandidates) {
      if (result.length >= RecommendationService.MIN_OUTFIT_ITEMS) break
      add(candidate.item)
    }

    return result
  }

  private buildOutfitName(eventType?: string, style?: string) {
    const safeEvent = eventType?.replace(/_/g, " ") || "outfit"
    const safeStyle = style?.replace(/_/g, " ")
    return safeStyle ? `${safeStyle} ${safeEvent}` : safeEvent
  }

  private buildOutfitItems(
    ids: number[],
    closet: RecommendationContextDTO["closet"],
  ): RecommendationContextDTO["closet"] {
    const closetById = new Map<number, RecommendationContextDTO["closet"][number]>()
    closet.forEach((item) => closetById.set(item.id, item))
    return ids.map((id) => closetById.get(id)).filter((item): item is RecommendationContextDTO["closet"][number] => Boolean(item))
  }

  private compactCloset(items: RecommendationContextDTO["closet"]) {
    return items.map((item) => ({
      id: item.id,
      name: item.name,
      categoryId: item.categoryId,
      category: item.category,
      color: item.color,
      season: item.season,
      material: item.material,
      isFavorite: item.isFavorite,
      tags: (item.tags || []).slice(0, RecommendationService.MAX_TAGS_PER_ITEM),
    }))
  }

  private chunk<T>(items: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < items.length; i += size) {
      chunks.push(items.slice(i, i + size))
    }
    return chunks
  }

  private async fetchWithRetry(url: string, payload: unknown) {
    let lastResponse: Response | null = null
    let lastError: Error | null = null
    const computeDelay = (attempt: number) =>
      RecommendationService.RETRY_BASE_MS * Math.pow(2, attempt) + Math.floor(Math.random() * 200)

    for (let attempt = 0; attempt < RecommendationService.RETRY_LIMIT; attempt += 1) {
      let shouldRetry = false
      let retryMessage = ""

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), RecommendationService.REQUEST_TIMEOUT_MS)
      let releaseLimiter: (() => void) | null = null
      try {
        releaseLimiter = await RecommendationService.GEMINI_LIMITER.acquire()

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        })

        if (response.ok) return response

        if (response.status === 429 || response.status === 503) {
          lastResponse = response
          shouldRetry = true
          retryMessage = `Gemini rate limit (${response.status})`
        } else {
          return response
        }
      } catch (error) {
        lastError = error as Error
        shouldRetry = true
        retryMessage = `Gemini request failed (${lastError.message})`
      } finally {
        clearTimeout(timeoutId)
        if (releaseLimiter) releaseLimiter()
      }

      if (shouldRetry && attempt < RecommendationService.RETRY_LIMIT - 1) {
        const delay = computeDelay(attempt)
        logger.warn(`${retryMessage}. Retrying in ${delay}ms...`)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }

    if (lastResponse) {
      throw new AppError(MESSAGES.RECOMMENDATION_FAILED, lastResponse.status, ErrorCode.SERVICE_UNAVAILABLE)
    }

    if (lastError) {
      throw new AppError(MESSAGES.RECOMMENDATION_FAILED, 503, ErrorCode.SERVICE_UNAVAILABLE)
    }

    throw new AppError(MESSAGES.RECOMMENDATION_FAILED, 503, ErrorCode.SERVICE_UNAVAILABLE)
  }

  private buildSafeContext(context: RecommendationContextDTO): RecommendationContextDTO {
    const normalizedCalendar =
      context.calendar?.slice(0, RecommendationService.MAX_CALENDAR_ITEMS).map((event) => {
        const eventType = event.eventType || mapEventType(event.title, undefined)
        return {
          ...event,
          eventType,
          dressCode: event.dressCode || mapDressCode(eventType),
          timeOfDay: event.timeOfDay || getTimeOfDay(event.start),
        }
      }) || []

    return {
      ...context,
      calendar: normalizedCalendar.length > 0
        ? normalizedCalendar
        : [
            {
              title: "general",
              eventType: "casual_social",
              dressCode: "smart_casual",
              timeOfDay: "day",
            },
          ],
      closet: context.closet.map((item) => ({
        ...item,
        tags: item.tags || [],
      })),
      preferences: (context.preferences || [])
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
        .slice(0, RecommendationService.MAX_PREFERENCES),
      selectedEventType: context.selectedEventType || normalizedCalendar[0]?.eventType || "casual_social",
      selectedStyle: context.selectedStyle || "smart_casual",
      includeAlternatives: Boolean(context.includeAlternatives),
      alternativesCount: Boolean(context.includeAlternatives)
        ? Math.min(
            RecommendationService.MAX_ALTERNATIVES,
            Math.max(1, context.alternativesCount ?? 2),
          )
        : 0,
    }
  }

  async recommendByContext(context: RecommendationContextDTO): Promise<RecommendationResponse> {
    return this.recommendOutfits(context)
  }

  async recommendBySelection(context: RecommendationContextDTO): Promise<RecommendationResponse> {
    return this.recommendOutfits(context)
  }

  private async recommendOutfits(context: RecommendationContextDTO): Promise<RecommendationResponse> {
    const apiKey = config.gemini_api_key
    const model = config.gemini_model || "gemini-1.5-flash"
    const useResponseSchema = !model.startsWith("gemini-2.5")
    const useThinkingBudgetZero = model.startsWith("gemini-2.5")
    const safeContext = this.buildSafeContext(context)
    const fullCloset = safeContext.closet
    const workingCloset = this.prefilterCloset(fullCloset, safeContext)
    const workingContext: RecommendationContextDTO = { ...safeContext, closet: workingCloset }
    const closetIds = new Set(fullCloset.map((item) => item.id))
    const hasInputCalendar = Array.isArray(context.calendar) && context.calendar.length > 0

    const toPromptContext = (ctx: RecommendationContextDTO): RecommendationContextDTO => ({
      ...ctx,
      closet: this.compactCloset(ctx.closet),
    })

    const shouldUseCache =
      !RecommendationService.DISABLE_CACHE &&
      RecommendationService.CACHE_TTL_MS > 0 &&
      RecommendationService.CACHE_MAX > 0

    const cacheKey = shouldUseCache
      ? createHash("sha256")
          .update(JSON.stringify({ model, context: toPromptContext(workingContext) }))
          .digest("hex")
      : null

    if (cacheKey) {
      const cached = RecommendationService.CACHE.get(cacheKey)
      if (cached) {
        if (cached.expiresAt > Date.now()) {
          return cached.value
        }
        RecommendationService.CACHE.delete(cacheKey)
      }
    }

    const setCache = (value: RecommendationResponse) => {
      if (!cacheKey) return
      const now = Date.now()

      for (const [key, entry] of RecommendationService.CACHE) {
        if (entry.expiresAt <= now) {
          RecommendationService.CACHE.delete(key)
        }
      }

      while (RecommendationService.CACHE.size >= RecommendationService.CACHE_MAX) {
        const oldestKey = RecommendationService.CACHE.keys().next().value as string | undefined
        if (!oldestKey) break
        RecommendationService.CACHE.delete(oldestKey)
      }

      RecommendationService.CACHE.set(cacheKey, {
        expiresAt: now + RecommendationService.CACHE_TTL_MS,
        value,
      })
    }
    const buildFallbackItems = () => {
      const favorites = fullCloset
        .filter((item) => item.isFavorite)
        .map((item) => Number(item.id))
        .filter((id) => Number.isFinite(id))
      const others = fullCloset
        .filter((item) => !item.isFavorite)
        .map((item) => Number(item.id))
        .filter((id) => Number.isFinite(id))
      const ordered = [...favorites, ...others]
      const unique = Array.from(new Set(ordered))
      if (unique.length <= 3) return unique
      return unique.slice(0, 6)
    }
    const fallbackItems = buildFallbackItems()
    if (fullCloset.length > 0 && fallbackItems.length === 0) {
      throw new AppError(MESSAGES.CLOSET_ITEM_IDS_INVALID, 400, ErrorCode.BAD_REQUEST)
    }

    const includeAlternatives = Boolean(workingContext.includeAlternatives)
    const alternativesCount = workingContext.alternativesCount ?? 0
    const minimizeCalls = RecommendationService.MINIMIZE_CALLS && !includeAlternatives

    const buildFallbackResponse = (reason: string): RecommendationResponse => {
      const items = this.enforceCategoryLimits(fallbackItems, fullCloset, workingContext)
      const primary: OutfitRecommendation = normalize({
        eventTitle: "general",
        eventType: workingContext.selectedEventType,
        style: workingContext.selectedStyle,
        items,
        notes: items.length
          ? [`Fallback recommendation (${reason}).`]
          : ["No recommendation generated. Provide more context or closet items."],
      })

      return {
        primary,
        alternatives: [],
        recommendations: [primary],
        model,
      }
    }

    if (!apiKey) {
      logger.error("Recommendation fallback: Gemini API key is missing")

      const items = this.enforceCategoryLimits(fallbackItems, fullCloset, workingContext)
      const eventType = workingContext.selectedEventType
      const style = workingContext.selectedStyle
      const primary: OutfitRecommendation = {
        outfit: {
          name: this.buildOutfitName(eventType, style),
          items: this.buildOutfitItems(items, fullCloset),
        },
        eventTitle: "general",
        eventType,
        style,
        items,
        notes: items.length
          ? ["Fallback recommendation (Gemini API key is missing)."]
          : ["No recommendation generated. Provide more context or closet items."],
        missingItems: [],
      }

      return {
        primary,
        alternatives: [],
        recommendations: [primary],
        model,
      }
    }

    const basePrompt = [
      "You are a wardrobe stylist.",
      "Task: pick the best outfit for the selected event type and fashion style.",
      "Use only item IDs from the provided closet.",
      "Pick 3-6 item IDs per outfit and never repeat the same item id within one outfit.",
      "Do not pick two items with the same categoryId within one outfit.",
      "Outfit must match the chosen style and event, and colors should be harmonious.",
      "Do NOT propose items that do not exist.",
      "If the closet lacks key pieces, add up to 6 missingItems inside each outfit (name, category, reason).",
      "Return ONLY minified JSON with no markdown or extra text.",
      "Never include any prefix/suffix text.",
      includeAlternatives
        ? `Return a primary outfit and up to ${Math.max(1, alternativesCount)} alternatives. Each alternative must differ from the primary by at least 1 item id, and alternatives must be distinct from each other.`
        : "Return only a primary outfit; alternatives must be an empty array.",
      "Keep notes concise (max 2 short sentences).",
    ].join(" ")

    const responseShape = includeAlternatives
      ? '{ "primary": { "eventType": "", "style": "", "items": [1,2,3,4], "notes": ["..."], "missingItems": [{ "name": "", "category": "", "reason": "" }] }, "alternatives": [{ "eventType": "", "style": "", "items": [1,2,3,4], "notes": ["..."], "missingItems": [{ "name": "", "category": "", "reason": "" }] }] }'
      : '{ "primary": { "eventType": "", "style": "", "items": [1,2,3,4], "notes": ["..."], "missingItems": [{ "name": "", "category": "", "reason": "" }] }, "alternatives": [] }'

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
    const buildRequestBody = (maxOutputTokens: number) => ({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `${basePrompt}\n\nReturn JSON with shape: ${responseShape}\n\nContext:\n${JSON.stringify(
                toPromptContext(workingContext),
              )}`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens,
        responseMimeType: "application/json",
        ...(useResponseSchema ? { responseSchema: RecommendationService.OUTFIT_RESPONSE_SCHEMA } : {}),
        ...(useThinkingBudgetZero ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
      },
    })

    const buildStrictRequestBody = (maxOutputTokens: number, contextForPrompt = workingContext) => ({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `${basePrompt}\nReturn ONLY minified JSON. No prose, no code fences.\nReturn JSON with shape: ${responseShape}\nContext:\n${JSON.stringify(
                toPromptContext(contextForPrompt),
              )}`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens,
        responseMimeType: "application/json",
        ...(useResponseSchema ? { responseSchema: RecommendationService.OUTFIT_RESPONSE_SCHEMA } : {}),
        ...(useThinkingBudgetZero ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
      },
    })

    const isLikelyJson = (text: string) => {
      const trimmed = text.trim()
      return trimmed.startsWith("{") || trimmed.startsWith("[")
    }

    const parseGeminiResponse = async (resp: Response) => {
      const data = (await resp.json()) as GeminiResponse
      let content = data.candidates?.[0]?.content?.parts?.[0]?.text || ""
      if (process.env.GEMINI_LOG_RAW === "true") {
        logger.info(`Gemini raw response (full): ${JSON.stringify(data)}`)
        if (content) {
          logger.info(`Gemini content (full): ${content}`)
        }
      }
      if (content) {
        const startsWithJson = isLikelyJson(content)
        if (!startsWithJson) {
          const sample = content.length > 120 ? `${content.slice(0, 120)}...` : content
          logger.warn(`Gemini response is not pure JSON. Sample: ${sample}`)
        }
        if (content.includes("```")) {
          logger.warn("Gemini response contains code fences (```), JSON may be wrapped.")
        }
        if (content.toLowerCase().includes("here is the json")) {
          logger.warn("Gemini response contains a prefix like 'Here is the JSON'.")
        }
        const preview = content.length > 2000 ? `${content.slice(0, 2000)}...` : content
        logger.debug(`Gemini raw response: ${preview}`)
      } else {
        logger.warn(`Gemini response missing content text. Raw: ${JSON.stringify(data)}`)
        logger.debug("Gemini raw response: <empty>")
      }
      return content
    }

    const extractJsonPayload = (raw: string) => {
      if (!raw) return ""
      let cleaned = raw.replace(/```json/gi, "```").trim()
      if (cleaned.includes("```")) {
        cleaned = cleaned.replace(/```/g, "").trim()
      }
      const first = cleaned.indexOf("{")
      const last = cleaned.lastIndexOf("}")
      if (first >= 0 && last > first) {
        return cleaned.slice(first, last + 1)
      }
      return cleaned
    }

    const repairJson = (raw: string) => {
      const cleaned = extractJsonPayload(raw)
      if (!cleaned) return cleaned
      const openBraces = (cleaned.match(/{/g) || []).length
      const closeBraces = (cleaned.match(/}/g) || []).length
      const openBrackets = (cleaned.match(/\[/g) || []).length
      const closeBrackets = (cleaned.match(/]/g) || []).length

      let repaired = cleaned
      if (openBrackets > closeBrackets) {
        repaired += "]".repeat(openBrackets - closeBrackets)
      }
      if (openBraces > closeBraces) {
        repaired += "}".repeat(openBraces - closeBraces)
      }

      if (repaired !== cleaned) {
        logger.debug("Repaired truncated JSON response from Gemini")
      }

      return repaired
    }

    const tryParse = (raw: string) => {
      try {
        const payload = repairJson(raw)
        return JSON.parse(payload)
      } catch {
        return {}
      }
    }

    const normalize = (rec?: {
      eventId?: string
      eventTitle?: string
      eventType?: string
      style?: string
      items?: number[]
      notes?: string[]
      missingItems?: Array<{ name?: string; category?: string; reason?: string }>
    }) => {
      const rawItems = (rec?.items || [])
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id))
        .filter((id) => closetIds.has(id))
      const uniqueItems = Array.from(new Set(rawItems))
      const adjustedItems = this.ensureOutfitItemIds(uniqueItems, fullCloset, workingContext)
      const outfitItems = this.buildOutfitItems(adjustedItems, fullCloset)
      const eventType = rec?.eventType || workingContext.selectedEventType
      const style = rec?.style || workingContext.selectedStyle
      return {
        outfit: {
          name: this.buildOutfitName(eventType, style),
          items: outfitItems,
        },
        eventId: rec?.eventId,
        eventTitle: rec?.eventTitle,
        eventType,
        style,
        items: adjustedItems,
        notes: rec?.notes || [],
        missingItems: this.hasFewSuitableItems(fullCloset, workingContext)
          ? (rec?.missingItems || [])
              .filter((item) => item?.name)
              .map((item) => ({
                name: String(item.name || "").trim(),
                category: item.category ? String(item.category).trim() : undefined,
                reason: item.reason ? String(item.reason).trim() : undefined,
              }))
              .filter((item) => item.name.length > 0)
              .slice(0, 6)
          : [],
      }
    }

    const fullContext = {
      ...workingContext,
      closet: this.compactCloset(workingContext.closet),
    }
    const rawOutputs: string[] = []
    const allowExtraCalls = fullContext.closet.length >= RecommendationService.CHUNK_SIZE

    let parsed: {
      primary?: {
        eventId?: string
        eventTitle?: string
        eventType?: string
        style?: string
        items?: number[]
        notes?: string[]
        missingItems?: Array<{ name?: string; category?: string; reason?: string }>
      }
      alternatives?: Array<{
        eventId?: string
        eventTitle?: string
        eventType?: string
        style?: string
        items?: number[]
        notes?: string[]
        missingItems?: Array<{ name?: string; category?: string; reason?: string }>
      }>
      recommendations?: Array<{
        eventId?: string
        eventTitle?: string
        eventType?: string
        style?: string
        items?: number[]
        notes?: string[]
        missingItems?: Array<{ name?: string; category?: string; reason?: string }>
      }>
    } = {}

    const requestItemsOnly = async (contextForPrompt: RecommendationContextDTO) => {
      const itemsPrompt = [
        basePrompt,
        "Return ONLY minified JSON: { \"items\": [1,2,3,4] }",
        "Pick 3-6 items that best fit the event/style.",
        "Context:",
        JSON.stringify(toPromptContext(contextForPrompt)),
      ].join("\n")

      const itemsResponse = await this.fetchWithRetry(endpoint, {
        contents: [{ role: "user", parts: [{ text: itemsPrompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 128,
          responseMimeType: "application/json",
          ...(useResponseSchema ? { responseSchema: RecommendationService.ITEMS_RESPONSE_SCHEMA } : {}),
          ...(useThinkingBudgetZero ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
        },
      })

      if (itemsResponse.ok) {
        const content = await parseGeminiResponse(itemsResponse)
        rawOutputs.push(content)
        const itemsParsed = tryParse(content) as { items?: number[] }
        const ids = (itemsParsed.items || [])
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id))
          .filter((id) => closetIds.has(id))
        return Array.from(new Set(ids)).slice(0, 6)
      }

      return []
    }

    const generateSingleRecommendation = async (
      contextForPrompt: RecommendationContextDTO,
    ): Promise<OutfitRecommendation> => {
      const localFullContext = {
        ...contextForPrompt,
        closet: this.compactCloset(contextForPrompt.closet),
      }
      let localParsed: {
        primary?: {
          eventId?: string
          eventTitle?: string
          eventType?: string
          style?: string
          items?: number[]
          notes?: string[]
          missingItems?: Array<{ name?: string; category?: string; reason?: string }>
        }
        recommendations?: Array<{
          eventId?: string
          eventTitle?: string
          eventType?: string
          style?: string
          items?: number[]
          notes?: string[]
          missingItems?: Array<{ name?: string; category?: string; reason?: string }>
        }>
      } = {}

      const seedItems = await requestItemsOnly(localFullContext)
      if (seedItems.length) {
        const seedContext = {
          ...localFullContext,
          closet: localFullContext.closet.filter((item) => seedItems.includes(item.id)),
        }
        const response = await this.fetchWithRetry(endpoint, buildStrictRequestBody(256, seedContext))
        if (response.ok) {
          const content = await parseGeminiResponse(response)
          rawOutputs.push(content)
          localParsed = tryParse(content)
        }
      } else {
        const response = await this.fetchWithRetry(endpoint, buildStrictRequestBody(320, localFullContext))
        if (response.ok) {
          const content = await parseGeminiResponse(response)
          rawOutputs.push(content)
          localParsed = tryParse(content)
        }
      }

      let primary: OutfitRecommendation = localParsed.primary
        ? normalize(localParsed.primary)
        : localParsed.recommendations?.length
          ? normalize(localParsed.recommendations[0])
          : normalize({
              eventTitle: "general",
              eventType: contextForPrompt.selectedEventType || workingContext.selectedEventType,
              style: contextForPrompt.selectedStyle || workingContext.selectedStyle,
              items: seedItems,
              notes: seedItems.length
                ? ["Generated from items-only selection."]
                : ["No recommendation generated. Provide more context or closet items."],
            })

      if (!primary.items.length && fallbackItems.length) {
        primary = normalize({
          ...primary,
          items: this.enforceCategoryLimits(fallbackItems, fullCloset, workingContext),
          notes: ["Generated with fallback selection."],
        })
      }

      return primary
    }

    try {
      const calendarEvents = workingContext.calendar || []
      if (hasInputCalendar && calendarEvents.length > 0) {
         const batchPrompt = [
         "You are a wardrobe stylist.",
         "Task: for each calendar event, pick the best outfit for the event type and dress code.",
         "Use only item IDs from the provided closet.",
         "Pick 3-6 item IDs per outfit and never repeat the same item id within one outfit.",
         "Do not pick two items with the same categoryId within one outfit.",
         "Outfits must match the event and colors should be harmonious.",
         "Do NOT propose items that do not exist.",
         "If the closet lacks key pieces, add up to 6 missingItems inside each outfit (name, category, reason).",
         "Return ONLY minified JSON with no markdown or extra text.",
         "Never include any prefix/suffix text.",
        "Return exactly one recommendation per calendar event, in the same order as provided.",
        "Include eventId and eventTitle for each recommendation if available.",
        "Use event.eventType and event.dressCode when present; otherwise use context.selectedEventType/style.",
        "Keep notes concise (max 2 short sentences).",
      ].join(" ")
 
         const batchResponseShape =
         '{ "recommendations": [ { "eventId": "", "eventTitle": "", "eventType": "", "style": "", "items": [1,2,3,4], "notes": ["..."], "missingItems": [{ "name": "", "category": "", "reason": "" }] } ] }'

        const batchContext: RecommendationContextDTO = {
        ...workingContext,
        calendar: calendarEvents.map((event) => ({
          ...event,
          eventType: event.eventType || workingContext.selectedEventType || "casual_social",
          dressCode: event.dressCode || workingContext.selectedStyle || "smart_casual",
        })),
        closet: this.compactCloset(workingContext.closet),
      }

        const maxOutputTokens = Math.min(1024, 256 + calendarEvents.length * 120)

        const batchResponse = await this.fetchWithRetry(endpoint, {
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `${batchPrompt}\n\nReturn JSON with shape: ${batchResponseShape}\n\nContext:\n${JSON.stringify(
                  batchContext,
                )}`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens,
          responseMimeType: "application/json",
          ...(useResponseSchema ? { responseSchema: RecommendationService.BATCH_RESPONSE_SCHEMA } : {}),
          ...(useThinkingBudgetZero ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
        },
      })

        let batchParsed: {
        recommendations?: Array<{
          eventId?: string
          eventTitle?: string
          eventType?: string
          style?: string
          items?: number[]
          notes?: string[]
          missingItems?: Array<{ name?: string; category?: string; reason?: string }>
        }>
        } = {}

        if (batchResponse.ok) {
          const content = await parseGeminiResponse(batchResponse)
          rawOutputs.push(content)
          batchParsed = tryParse(content)
        }

        const batchRecs = batchParsed.recommendations || []
        const perEventRecommendations: OutfitRecommendation[] = calendarEvents.map((event, index) => {
          const raw = batchRecs[index]
          const eventType = raw?.eventType || event.eventType || workingContext.selectedEventType
          const style = raw?.style || event.dressCode || workingContext.selectedStyle
          let rec = raw
            ? normalize({
              ...raw,
              eventId: event.id || raw.eventId,
              eventTitle: event.title || raw.eventTitle,
              eventType,
              style,
              })
            : normalize({
              eventId: event.id,
              eventTitle: event.title,
              eventType,
              style,
              items: fallbackItems,
              notes: ["Generated with fallback selection."],
            })

          if (!rec.items.length && fallbackItems.length) {
            rec = normalize({
            ...rec,
            eventType,
            style,
            items: this.enforceCategoryLimits(fallbackItems, fullCloset, workingContext),
            notes: ["Generated with fallback selection."],
            })
          }

          return rec
        })

        const primary = perEventRecommendations[0] || normalize({
        eventTitle: "general",
        eventType: workingContext.selectedEventType,
        style: workingContext.selectedStyle,
        items: this.enforceCategoryLimits(fallbackItems, fullCloset, workingContext),
        notes: ["Generated with fallback selection."],
        })

        const result = {
          primary,
          alternatives: [],
          recommendations: perEventRecommendations,
          model,
        }

        setCache(result)
        return result
      }

      const seedItems = await requestItemsOnly(fullContext)
      if (seedItems.length) {
        const seedContext = {
        ...fullContext,
        closet: fullContext.closet.filter((item) => seedItems.includes(item.id)),
        }

        const response = await this.fetchWithRetry(endpoint, buildStrictRequestBody(256, seedContext))
        if (response.ok) {
          const content = await parseGeminiResponse(response)
          rawOutputs.push(content)
          parsed = tryParse(content)
        }

        if (!parsed.primary && !parsed.recommendations) {
          parsed = {
            primary: {
              eventType: workingContext.selectedEventType,
              style: workingContext.selectedStyle,
              items: seedItems,
              notes: ["Generated from items-only selection."],
            },
            alternatives: [],
          }
        }
      }

      if (!seedItems.length) {
        const response = await this.fetchWithRetry(endpoint, buildStrictRequestBody(320, fullContext))
        if (response.ok) {
          const content = await parseGeminiResponse(response)
          rawOutputs.push(content)
          parsed = tryParse(content)
        }
      }

      if (minimizeCalls) {
        let primary: OutfitRecommendation = parsed.primary
          ? normalize(parsed.primary)
          : parsed.recommendations?.length
            ? normalize(parsed.recommendations[0])
            : normalize({
              eventTitle: "general",
              eventType: workingContext.selectedEventType,
              style: workingContext.selectedStyle,
              items: seedItems,
              notes: seedItems.length
                ? ["Generated from items-only selection."]
                : ["No recommendation generated. Provide more context or closet items."],
            })

        if (!primary.items.length && fallbackItems.length) {
          primary = normalize({
            ...primary,
            items: this.enforceCategoryLimits(fallbackItems, fullCloset, workingContext),
            notes: ["Generated with fallback selection."],
          })
        }

        const result = {
          primary,
          alternatives: [],
          recommendations: [],
          model,
        }

        setCache(result)
        return result
      }

    if (
      !minimizeCalls &&
      !parsed.primary &&
      !parsed.recommendations &&
      fullContext.closet.length >= RecommendationService.CHUNK_SIZE
    ) {
      const chunks = this.chunk(fullContext.closet, RecommendationService.CHUNK_SIZE)
      const candidateIds = new Set<number>()

      for (let i = 0; i < chunks.length; i += 1) {
        const chunkPrompt = [
          basePrompt,
          "From this subset of the closet, return ONLY candidate item IDs that fit the event/style.",
          "Return minified JSON: { \"candidates\": [1,2,3] }",
          "Return at most 20 candidate IDs.",
          `Subset ${i + 1}/${chunks.length}`,
          "Context:",
          JSON.stringify({
            ...fullContext,
            closet: chunks[i],
          }),
        ].join("\n")

        const resp = await this.fetchWithRetry(endpoint, {
          contents: [{ role: "user", parts: [{ text: chunkPrompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 160,
            responseMimeType: "application/json",
            ...(useResponseSchema ? { responseSchema: RecommendationService.CANDIDATE_RESPONSE_SCHEMA } : {}),
            ...(useThinkingBudgetZero ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
          },
        })

        if (!resp.ok) {
          throw new AppError(MESSAGES.RECOMMENDATION_FAILED, resp.status, ErrorCode.SERVICE_UNAVAILABLE)
        }

        const raw = await parseGeminiResponse(resp)
        rawOutputs.push(raw)
        const parsedChunk = tryParse(raw) as { candidates?: number[] }
        parsedChunk.candidates?.forEach((id) => {
          if (closetIds.has(id)) candidateIds.add(id)
        })
      }

      const shortlist = fullContext.closet
        .filter((item) => candidateIds.has(item.id))
        .slice(0, 30)
      const finalContext = {
        ...fullContext,
        closet: shortlist.length ? shortlist : fullContext.closet,
      }

      const response = await this.fetchWithRetry(endpoint, {
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `${basePrompt}\n\nReturn JSON with shape: ${responseShape}\n\nContext:\n${JSON.stringify(
                  finalContext,
                )}`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 320,
          responseMimeType: "application/json",
          ...(useResponseSchema ? { responseSchema: RecommendationService.OUTFIT_RESPONSE_SCHEMA } : {}),
          ...(useThinkingBudgetZero ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
        },
      })

      if (!response.ok) {
        throw new AppError(MESSAGES.RECOMMENDATION_FAILED, response.status, ErrorCode.SERVICE_UNAVAILABLE)
      }

      let content = await parseGeminiResponse(response)
      if (!content || !isLikelyJson(content)) {
        const strictResponse = await this.fetchWithRetry(endpoint, buildStrictRequestBody(256, finalContext))
        if (strictResponse.ok) {
          content = await parseGeminiResponse(strictResponse)
        }
      }
      rawOutputs.push(content)
      parsed = tryParse(content)
    } else if (!minimizeCalls && !parsed.primary && !parsed.recommendations) {
      const response = await this.fetchWithRetry(endpoint, buildRequestBody(320))

      if (!response.ok) {
        throw new AppError(MESSAGES.RECOMMENDATION_FAILED, response.status, ErrorCode.SERVICE_UNAVAILABLE)
      }

      let content = await parseGeminiResponse(response)
      if (!content || !isLikelyJson(content)) {
        const strictResponse = await this.fetchWithRetry(endpoint, buildStrictRequestBody(256))
        if (strictResponse.ok) {
          content = await parseGeminiResponse(strictResponse)
        }
      }
      rawOutputs.push(content)
      parsed = tryParse(content)
    }

    if (!minimizeCalls && allowExtraCalls && !parsed.primary && !parsed.recommendations) {
      const retryResponse = await this.fetchWithRetry(endpoint, buildRequestBody(256))

      if (retryResponse.ok) {
        const content = await parseGeminiResponse(retryResponse)
        rawOutputs.push(content)
        parsed = tryParse(content)
      }
    }

    if (!minimizeCalls && allowExtraCalls && !parsed.primary && !parsed.recommendations) {
      const fallbackPrompt = [
        basePrompt,
        "Return ONLY minified JSON: { \"items\": [1,2,3,4] }",
        "Pick 3-6 items that best fit the event/style.",
        "Context:",
        JSON.stringify({
          ...workingContext,
          closet: this.compactCloset(workingContext.closet),
        }),
      ].join("\n")

      const fallbackResponse = await this.fetchWithRetry(endpoint, {
        contents: [{ role: "user", parts: [{ text: fallbackPrompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 128,
          responseMimeType: "application/json",
          ...(useResponseSchema ? { responseSchema: RecommendationService.ITEMS_RESPONSE_SCHEMA } : {}),
          ...(useThinkingBudgetZero ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
        },
      })

      if (fallbackResponse.ok) {
        const content = await parseGeminiResponse(fallbackResponse)
        rawOutputs.push(content)
        const fallbackParsed = tryParse(content) as { items?: number[] }
        if (fallbackParsed.items?.length) {
          parsed = {
            primary: {
              eventType: workingContext.selectedEventType,
              style: workingContext.selectedStyle,
              items: fallbackParsed.items,
              notes: ["Generated with fallback selection."],
            },
            alternatives: [],
          }
        }
      }
    }

    const hasItems = (rec?: { items?: number[] }) => Array.isArray(rec?.items) && rec!.items!.length > 0
    if (!minimizeCalls && !hasItems(parsed.primary) && !hasItems(parsed.recommendations?.[0])) {
      const itemsPrompt = [
        basePrompt,
        "Return ONLY minified JSON: { \"items\": [1,2,3,4] }",
        "Pick 3-6 items that best fit the event/style.",
        "Context:",
        JSON.stringify({
          ...workingContext,
          closet: this.compactCloset(workingContext.closet),
        }),
      ].join("\n")

      const itemsResponse = await this.fetchWithRetry(endpoint, {
        contents: [{ role: "user", parts: [{ text: itemsPrompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 128,
          responseMimeType: "application/json",
          ...(useResponseSchema ? { responseSchema: RecommendationService.ITEMS_RESPONSE_SCHEMA } : {}),
          ...(useThinkingBudgetZero ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
        },
      })

      if (itemsResponse.ok) {
        const content = await parseGeminiResponse(itemsResponse)
        rawOutputs.push(content)
        const itemsParsed = tryParse(content) as { items?: number[] }
        if (itemsParsed.items?.length) {
          parsed = {
            primary: {
              eventType: workingContext.selectedEventType,
              style: workingContext.selectedStyle,
              items: itemsParsed.items,
              notes: ["Generated with items-only fallback."],
            },
            alternatives: [],
          }
        }
      }
    }

    if (!minimizeCalls && !hasItems(parsed.primary) && !hasItems(parsed.recommendations?.[0])) {
      const extracted = rawOutputs
        .join(" ")
        .match(/\b\d+\b/g)
        ?.map((value) => Number.parseInt(value, 10))
        .filter((id) => Number.isFinite(id) && closetIds.has(id)) || []

      const uniqueIds = Array.from(new Set(extracted)).slice(0, 6)
      if (uniqueIds.length) {
        parsed = {
          primary: {
            eventType: workingContext.selectedEventType,
            style: workingContext.selectedStyle,
            items: uniqueIds,
            notes: ["Generated from partial AI output."],
          },
          alternatives: [],
        }
      }
    }

    let primary: OutfitRecommendation = parsed.primary
      ? normalize(parsed.primary)
      : parsed.recommendations?.length
        ? normalize(parsed.recommendations[0])
        : normalize({
            eventTitle: "general",
            eventType: workingContext.selectedEventType,
            style: workingContext.selectedStyle,
            items: [],
            notes: ["No recommendation generated. Provide more context or closet items."],
          })

    if (!primary.items.length && fallbackItems.length) {
      primary = normalize({
        ...primary,
        items: this.enforceCategoryLimits(fallbackItems, fullCloset, workingContext),
        notes: ["Generated with fallback selection."],
      })
    }

    const rawAlternatives = includeAlternatives
      ? parsed.alternatives?.map((rec) => normalize(rec)) ||
        parsed.recommendations?.slice(1).map((rec) => normalize(rec)) ||
        []
      : []

    const itemsKey = (ids: number[]) => ids.slice().sort((a, b) => a - b).join(",")
    const desiredAlternatives = Math.max(1, alternativesCount || RecommendationService.MAX_ALTERNATIVES)

    const alternatives = (() => {
      if (!includeAlternatives) return []
      const primaryKey = itemsKey(primary.items)
      const seen = new Set<string>([primaryKey])
      const unique: OutfitRecommendation[] = []

      for (const alt of rawAlternatives) {
        if (!alt.items.length) continue
        const key = itemsKey(alt.items)
        if (seen.has(key)) continue
        seen.add(key)
        unique.push(alt)
        if (unique.length >= desiredAlternatives) break
      }

      return unique
    })()

    const recommendations: OutfitRecommendation[] = [primary, ...alternatives]

      const result = {
        primary,
        alternatives,
        recommendations,
        model,
      }

      setCache(result)
      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : "AI unavailable"
      logger.error(`Recommendation fallback: ${message}`)
      return buildFallbackResponse(message)
    }
  }
}
