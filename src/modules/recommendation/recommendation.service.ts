import config from "@config/env"
import logger from "@config/logger"
import { AppError } from "@common/errors/app-error"
import { ErrorCode } from "@common/enums/error-code.enum"
import type { RecommendationContextDTO, RecommendationResponse } from "./recommendation.dto"
import { getTimeOfDay, mapDressCode, mapEventType } from "@helpers/context.helper"

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>
    }
  }>
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
  private static readonly OUTFIT_RESPONSE_SCHEMA = {
    type: "object",
    properties: {
      primary: {
        type: "object",
        properties: {
          eventType: { type: "string" },
          style: { type: "string" },
          items: { type: "array", items: { type: "number" } },
          notes: { type: "array", items: { type: "string" } },
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
            items: { type: "array", items: { type: "number" } },
            notes: { type: "array", items: { type: "string" } },
          },
          required: ["items", "notes"],
        },
      },
    },
    required: ["primary", "alternatives"],
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
      items: { type: "array", items: { type: "number" } },
    },
    required: ["items"],
  }

  private compactCloset(items: RecommendationContextDTO["closet"]) {
    return items.map((item) => ({
      id: item.id,
      category: item.category,
      color: item.color,
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
    for (let attempt = 0; attempt < RecommendationService.RETRY_LIMIT; attempt += 1) {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), RecommendationService.REQUEST_TIMEOUT_MS)
      try {
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
          const delay =
            RecommendationService.RETRY_BASE_MS * Math.pow(2, attempt) +
            Math.floor(Math.random() * 200)
          logger.warn(`Gemini rate limit (${response.status}). Retrying in ${delay}ms...`)
          await new Promise((resolve) => setTimeout(resolve, delay))
          lastResponse = response
          continue
        }

        return response
      } catch (error) {
        lastError = error as Error
        const delay =
          RecommendationService.RETRY_BASE_MS * Math.pow(2, attempt) +
          Math.floor(Math.random() * 200)
        logger.warn(`Gemini request failed (${lastError.message}). Retrying in ${delay}ms...`)
        await new Promise((resolve) => setTimeout(resolve, delay))
      } finally {
        clearTimeout(timeoutId)
      }
    }

    if (lastResponse) {
      throw new AppError("Failed to generate outfit recommendation", lastResponse.status, ErrorCode.SERVICE_UNAVAILABLE)
    }

    if (lastError) {
      throw new AppError("Failed to generate outfit recommendation", 503, ErrorCode.SERVICE_UNAVAILABLE)
    }

    throw new AppError("Failed to generate outfit recommendation", 503, ErrorCode.SERVICE_UNAVAILABLE)
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
    if (!apiKey) {
      throw new AppError("Gemini API key is missing", 500, ErrorCode.SERVICE_UNAVAILABLE)
    }

    const model = config.gemini_model || "gemini-1.5-flash"
    const useResponseSchema = !model.startsWith("gemini-2.5")
    const useThinkingBudgetZero = model.startsWith("gemini-2.5")
    const closetIds = new Set(context.closet.map((item) => item.id))
    const safeContext = this.buildSafeContext(context)
    const hasInputCalendar = Array.isArray(context.calendar) && context.calendar.length > 0
    const buildFallbackItems = () => {
      const favorites = safeContext.closet
        .filter((item) => item.isFavorite)
        .map((item) => Number(item.id))
        .filter((id) => Number.isFinite(id))
      const others = safeContext.closet
        .filter((item) => !item.isFavorite)
        .map((item) => Number(item.id))
        .filter((id) => Number.isFinite(id))
      const ordered = [...favorites, ...others]
      const unique = Array.from(new Set(ordered))
      if (unique.length <= 3) return unique
      return unique.slice(0, 6)
    }
    const fallbackItems = buildFallbackItems()
    if (safeContext.closet.length > 0 && fallbackItems.length === 0) {
      throw new AppError("Closet item ids are invalid", 400, ErrorCode.BAD_REQUEST)
    }

    const basePrompt = [
      "You are a wardrobe stylist.",
      "Task: pick the best outfit for the selected event type and fashion style.",
      "Use only item IDs from the provided closet.",
      "Outfit must match the chosen style and event, and colors should be harmonious.",
      "Do NOT propose items that do not exist.",
      "Return ONLY minified JSON with no markdown or extra text.",
      "Never include any prefix/suffix text.",
      "Return only a primary outfit; alternatives must be an empty array.",
      "Keep notes concise (max 2 short sentences).",
    ].join(" ")

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
    const buildRequestBody = (maxOutputTokens: number) => ({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `${basePrompt}\n\nReturn JSON with shape: { "primary": { "eventType": "", "style": "", "items": [1,2], "notes": ["..."] }, "alternatives": [] }\n\nContext:\n${JSON.stringify(
                safeContext,
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

    const buildStrictRequestBody = (maxOutputTokens: number, contextForPrompt = safeContext) => ({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `${basePrompt}\nReturn ONLY minified JSON. No prose, no code fences.\nReturn JSON with shape: { "primary": { "eventType": "", "style": "", "items": [1,2], "notes": ["..."] }, "alternatives": [] }\nContext:\n${JSON.stringify(
                contextForPrompt,
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
    }) => ({
      eventId: rec?.eventId,
      eventTitle: rec?.eventTitle,
      eventType: rec?.eventType || safeContext.selectedEventType,
      style: rec?.style || safeContext.selectedStyle,
      items: (rec?.items || [])
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id))
        .filter((id) => closetIds.has(id)),
      notes: rec?.notes || [],
    })

    const fullContext = {
      ...safeContext,
      closet: this.compactCloset(safeContext.closet),
    }
    const rawOutputs: string[] = []
    const allowExtraCalls = fullContext.closet.length >= RecommendationService.CHUNK_SIZE

    let parsed: {
      primary?: { eventId?: string; eventTitle?: string; eventType?: string; style?: string; items?: number[]; notes?: string[] }
      alternatives?: Array<{ eventId?: string; eventTitle?: string; eventType?: string; style?: string; items?: number[]; notes?: string[] }>
      recommendations?: Array<{ eventId?: string; eventTitle?: string; eventType?: string; style?: string; items?: number[]; notes?: string[] }>
    } = {}

    const requestItemsOnly = async (contextForPrompt: RecommendationContextDTO) => {
      const itemsPrompt = [
        basePrompt,
        "Return ONLY minified JSON: { \"items\": [1,2,3,4] }",
        "Pick 3-6 items that best fit the event/style.",
        "Context:",
        JSON.stringify(contextForPrompt),
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

    type NormalizedRecommendation = {
      eventId?: string
      eventTitle?: string
      eventType?: string
      style?: string
      items: number[]
      notes: string[]
    }

    const generateSingleRecommendation = async (
      contextForPrompt: RecommendationContextDTO,
    ): Promise<NormalizedRecommendation> => {
      const localFullContext = {
        ...contextForPrompt,
        closet: this.compactCloset(contextForPrompt.closet),
      }
      let localParsed: {
        primary?: { eventId?: string; eventTitle?: string; eventType?: string; style?: string; items?: number[]; notes?: string[] }
        recommendations?: Array<{ eventId?: string; eventTitle?: string; eventType?: string; style?: string; items?: number[]; notes?: string[] }>
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

      let primary: NormalizedRecommendation = localParsed.primary
        ? normalize(localParsed.primary)
        : localParsed.recommendations?.length
          ? normalize(localParsed.recommendations[0])
          : {
              eventTitle: "general",
              eventType: contextForPrompt.selectedEventType || safeContext.selectedEventType,
              style: contextForPrompt.selectedStyle || safeContext.selectedStyle,
              items: seedItems,
              notes: seedItems.length
                ? ["Generated from items-only selection."]
                : ["No recommendation generated. Provide more context or closet items."],
            }

      if (!primary.items.length && fallbackItems.length) {
        primary = {
          ...primary,
          items: fallbackItems,
          notes: ["Generated with fallback selection."],
        }
      }

      return primary
    }

    const calendarEvents = safeContext.calendar || []
    if (hasInputCalendar && calendarEvents.length > 0) {
      const perEventRecommendations: NormalizedRecommendation[] = []

      for (const event of calendarEvents) {
        const eventContext: RecommendationContextDTO = {
          ...safeContext,
          calendar: [event],
          selectedEventType: event.eventType || safeContext.selectedEventType,
          selectedStyle: event.dressCode || safeContext.selectedStyle,
        }
        const rec = await generateSingleRecommendation(eventContext)
        perEventRecommendations.push({
          ...rec,
          eventId: event.id || rec.eventId || undefined,
          eventTitle: event.title || rec.eventTitle || undefined,
        })
      }

      const primary = perEventRecommendations[0] || {
        eventTitle: "general",
        eventType: safeContext.selectedEventType,
        style: safeContext.selectedStyle,
        items: fallbackItems,
        notes: ["Generated with fallback selection."],
      }

      return {
        primary,
        alternatives: [],
        recommendations: perEventRecommendations,
        model,
      }
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
            eventType: safeContext.selectedEventType,
            style: safeContext.selectedStyle,
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

    if (RecommendationService.MINIMIZE_CALLS) {
      let primary = parsed.primary
        ? normalize(parsed.primary)
        : parsed.recommendations?.length
          ? normalize(parsed.recommendations[0])
          : {
              eventTitle: "general",
              eventType: safeContext.selectedEventType,
              style: safeContext.selectedStyle,
              items: seedItems,
              notes: seedItems.length
                ? ["Generated from items-only selection."]
                : ["No recommendation generated. Provide more context or closet items."],
            }

      if (!primary.items.length && fallbackItems.length) {
        primary = {
          ...primary,
          items: fallbackItems,
          notes: ["Generated with fallback selection."],
        }
      }

      return {
        primary,
        alternatives: [],
        recommendations: [],
        model,
      }
    }

    if (
      !RecommendationService.MINIMIZE_CALLS &&
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
          throw new AppError("Failed to generate outfit recommendation", resp.status, ErrorCode.SERVICE_UNAVAILABLE)
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
                text: `${basePrompt}\n\nReturn JSON with shape: { "primary": { "eventType": "", "style": "", "items": [1,2], "notes": ["..."] }, "alternatives": [] }\n\nContext:\n${JSON.stringify(
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
        throw new AppError("Failed to generate outfit recommendation", response.status, ErrorCode.SERVICE_UNAVAILABLE)
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
    } else if (!RecommendationService.MINIMIZE_CALLS && !parsed.primary && !parsed.recommendations) {
      const response = await this.fetchWithRetry(endpoint, buildRequestBody(320))

      if (!response.ok) {
        throw new AppError("Failed to generate outfit recommendation", response.status, ErrorCode.SERVICE_UNAVAILABLE)
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

    if (!RecommendationService.MINIMIZE_CALLS && allowExtraCalls && !parsed.primary && !parsed.recommendations) {
      const retryResponse = await this.fetchWithRetry(endpoint, buildRequestBody(256))

      if (retryResponse.ok) {
        const content = await parseGeminiResponse(retryResponse)
        rawOutputs.push(content)
        parsed = tryParse(content)
      }
    }

    if (!RecommendationService.MINIMIZE_CALLS && allowExtraCalls && !parsed.primary && !parsed.recommendations) {
      const fallbackPrompt = [
        basePrompt,
        "Return ONLY minified JSON: { \"items\": [1,2,3,4] }",
        "Pick 3-6 items that best fit the event/style.",
        "Context:",
        JSON.stringify({
          ...safeContext,
          closet: this.compactCloset(safeContext.closet),
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
              eventType: safeContext.selectedEventType,
              style: safeContext.selectedStyle,
              items: fallbackParsed.items,
              notes: ["Generated with fallback selection."],
            },
            alternatives: [],
          }
        }
      }
    }

    const hasItems = (rec?: { items?: number[] }) => Array.isArray(rec?.items) && rec!.items!.length > 0
    if (!RecommendationService.MINIMIZE_CALLS && !hasItems(parsed.primary) && !hasItems(parsed.recommendations?.[0])) {
      const itemsPrompt = [
        basePrompt,
        "Return ONLY minified JSON: { \"items\": [1,2,3,4] }",
        "Pick 3-6 items that best fit the event/style.",
        "Context:",
        JSON.stringify({
          ...safeContext,
          closet: this.compactCloset(safeContext.closet),
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
              eventType: safeContext.selectedEventType,
              style: safeContext.selectedStyle,
              items: itemsParsed.items,
              notes: ["Generated with items-only fallback."],
            },
            alternatives: [],
          }
        }
      }
    }

    if (!RecommendationService.MINIMIZE_CALLS && !hasItems(parsed.primary) && !hasItems(parsed.recommendations?.[0])) {
      const extracted = rawOutputs
        .join(" ")
        .match(/\b\d+\b/g)
        ?.map((value) => Number.parseInt(value, 10))
        .filter((id) => Number.isFinite(id) && closetIds.has(id)) || []

      const uniqueIds = Array.from(new Set(extracted)).slice(0, 6)
      if (uniqueIds.length) {
        parsed = {
          primary: {
            eventType: safeContext.selectedEventType,
            style: safeContext.selectedStyle,
            items: uniqueIds,
            notes: ["Generated from partial AI output."],
          },
          alternatives: [],
        }
      }
    }

    let primary: {
      eventId?: string
      eventTitle?: string
      eventType?: string
      style?: string
      items: number[]
      notes: string[]
    } = parsed.primary
      ? normalize(parsed.primary)
      : parsed.recommendations?.length
        ? normalize(parsed.recommendations[0])
        : {
            eventTitle: "general",
            eventType: safeContext.selectedEventType,
            style: safeContext.selectedStyle,
            items: [],
            notes: ["No recommendation generated. Provide more context or closet items."],
          }

    if (!primary.items.length && fallbackItems.length) {
      primary = {
        ...primary,
        items: fallbackItems,
        notes: ["Generated with fallback selection."],
      }
    }

    const alternatives =
      parsed.alternatives?.map((rec) => normalize(rec)) ||
      parsed.recommendations?.slice(1).map((rec) => normalize(rec)) ||
      []

    const recommendations = [primary, ...alternatives]

    return {
      primary,
      alternatives,
      recommendations,
      model,
    }
  }
}
