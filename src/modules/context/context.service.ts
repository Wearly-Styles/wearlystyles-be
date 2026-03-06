import { prisma } from "@modules/prisma"
import config from "@config/env"
import { AppError } from "@common/errors/app-error"
import { ErrorCode } from "@common/enums/error-code.enum"
import { MESSAGES } from "@common/constants/messages.constant"
import type { CalendarQueryDTO, NormalizedClosetItem, NormalizedEvent, NormalizedWeather, WeatherQueryDTO } from "./context.dto"
import { buildWeatherTags, getTimeOfDay, mapDressCode, mapEventType } from "@helpers/context.helper"

const OPEN_WEATHER_BASE_URL = "https://api.openweathermap.org/data/2.5"

type OpenWeatherCurrent = {
  dt: number
  weather?: Array<{ id: number; main: string; description: string }>
  main?: { temp: number; humidity: number }
}

type OpenWeatherForecast = {
  list?: Array<{
    dt: number
    pop?: number
    weather?: Array<{ id: number; main: string; description: string }>
    main?: { temp: number; humidity: number }
  }>
}

type GoogleCalendarEvent = {
  id?: string
  summary?: string
  description?: string
  location?: string
  start?: { dateTime?: string; date?: string }
  end?: { dateTime?: string; date?: string }
}

export class ContextService {
  private static readonly REQUEST_TIMEOUT_MS = 8000

  private async fetchWithTimeout(url: string, options?: RequestInit) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), ContextService.REQUEST_TIMEOUT_MS)
    try {
      return await fetch(url, { ...options, signal: controller.signal })
    } finally {
      clearTimeout(timeoutId)
    }
  }

  private async fetchOpenWeather<T>(endpoint: string, lat: number, lon: number): Promise<T> {
    const apiKey = config.openweather_api_key
    if (!apiKey) {
      throw new AppError(MESSAGES.CONTEXT_WEATHER_UNAVAILABLE, 503, ErrorCode.SERVICE_UNAVAILABLE)
    }

    const url = `${OPEN_WEATHER_BASE_URL}/${endpoint}?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`
    const response = await this.fetchWithTimeout(url)
    if (!response.ok) {
      throw new AppError(MESSAGES.CONTEXT_WEATHER_UNAVAILABLE, 503, ErrorCode.SERVICE_UNAVAILABLE)
    }

    return (await response.json()) as T
  }

  private pickForecastItem(forecast: OpenWeatherForecast, datetime?: string) {
    const list = forecast.list || []
    if (list.length === 0) return null
    if (!datetime) return list[0]

    const target = new Date(datetime).getTime()
    if (Number.isNaN(target)) return list[0]

    return list.reduce((closest, current) => {
      if (!closest) return current
      const diffCurrent = Math.abs(current.dt * 1000 - target)
      const diffClosest = Math.abs(closest.dt * 1000 - target)
      return diffCurrent < diffClosest ? current : closest
    })
  }

  async getWeatherContext(query: WeatherQueryDTO): Promise<NormalizedWeather> {
    const current = await this.fetchOpenWeather<OpenWeatherCurrent>("weather", query.lat, query.lon)
    const forecast = await this.fetchOpenWeather<OpenWeatherForecast>("forecast", query.lat, query.lon)
    const forecastItem = this.pickForecastItem(forecast, query.datetime)

    const tempC = forecastItem?.main?.temp ?? current.main?.temp ?? null
    const humidity = forecastItem?.main?.humidity ?? current.main?.humidity ?? null
    const conditionCode = forecastItem?.weather?.[0]?.id ?? current.weather?.[0]?.id ?? null
    const rainProbability = Math.round(((forecastItem?.pop ?? 0) as number) * 100)
    const observedAt = new Date((forecastItem?.dt ?? current.dt) * 1000).toISOString()

    return {
      tempC,
      conditionCode,
      rainProbability,
      humidity,
      tags: buildWeatherTags({ tempC, humidity, rainProbability, conditionCode }),
      source: "openweather",
      observedAt,
    }
  }

  async getCalendarContext(query: CalendarQueryDTO): Promise<NormalizedEvent[]> {
    const { accessToken } = query
    if (!accessToken) {
      throw new AppError(MESSAGES.CONTEXT_GOOGLE_TOKEN_REQUIRED, 400, ErrorCode.BAD_REQUEST)
    }

    const timeMin = query.timeMin || new Date().toISOString()
    const timeMax =
      query.timeMax || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    const maxResults = query.maxResults ?? 20

    const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events")
    url.searchParams.set("timeMin", timeMin)
    url.searchParams.set("timeMax", timeMax)
    url.searchParams.set("singleEvents", "true")
    url.searchParams.set("orderBy", "startTime")
    url.searchParams.set("maxResults", maxResults.toString())

    const response = await this.fetchWithTimeout(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      throw new AppError(MESSAGES.CONTEXT_CALENDAR_UNAVAILABLE, 503, ErrorCode.SERVICE_UNAVAILABLE)
    }

    const data = (await response.json()) as { items?: GoogleCalendarEvent[] }
    const events = data.items || []

    return events.map((event) => {
      const title = event.summary || "Untitled event"
      const start = event.start?.dateTime || event.start?.date
      const end = event.end?.dateTime || event.end?.date
      const eventType = mapEventType(title, event.description)
      return {
        id: event.id,
        title,
        start,
        end,
        location: event.location,
        eventType,
        dressCode: mapDressCode(eventType),
        timeOfDay: getTimeOfDay(start),
      }
    })
  }

  async getClosetContext(userId: number): Promise<NormalizedClosetItem[]> {
    const items = await prisma.clothingItem.findMany({
      where: { userId },
      include: {
        category: true,
        tags: {
          include: {
            tag: true,
          },
        },
      },
    })

    return items.map((item) => {
      const tagNames = item.tags
        .map((tagLink) => tagLink.tag?.name)
        .filter((tag): tag is string => Boolean(tag))
        .map((tag) => tag.toLowerCase())

      const derivedTags = [item.color, item.season, item.material]
        .filter((value): value is string => Boolean(value))
        .map((value) => value.toLowerCase())

      const tags = Array.from(new Set([...tagNames, ...derivedTags]))

      return {
        id: item.id,
        name: item.name || undefined,
        categoryId: item.categoryId ?? undefined,
        category: item.category?.name || undefined,
        color: item.color || undefined,
        image: item.image || undefined,
        season: item.season || undefined,
        material: item.material || undefined,
        isFavorite: item.isFavorite ?? undefined,
        tags,
      }
    })
  }
}
