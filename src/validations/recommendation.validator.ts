import { z } from "zod"

const normalizedWeatherSchema = z
  .object({
    tempC: z.number().nullable().optional(),
    conditionCode: z.number().nullable().optional(),
    rainProbability: z.number().optional(),
    humidity: z.number().nullable().optional(),
    tags: z.array(z.string()).optional(),
    source: z.string().optional(),
    observedAt: z.string().optional(),
  })
  .partial()

const normalizedEventSchema = z
  .object({
    id: z.string().optional(),
    title: z.string().optional(),
    start: z.string().optional(),
    end: z.string().optional(),
    location: z.string().optional(),
    eventType: z.string().optional(),
    dressCode: z.string().optional(),
    timeOfDay: z.string().optional(),
  })
  .partial()

const normalizedClosetItemSchema = z
  .object({
    id: z.coerce.number().int().positive(),
    name: z.string().optional(),
    category: z.string().optional(),
    color: z.string().optional(),
    image: z.string().optional(),
    season: z.string().optional(),
    material: z.string().optional(),
    isFavorite: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
  })
  .partial({ tags: true })

const weatherQuerySchema = z.object({
  lat: z.coerce.number(),
  lon: z.coerce.number(),
  datetime: z.string().optional(),
})

const calendarQuerySchema = z.object({
  accessToken: z.string().min(1, "Google access token is required"),
  timeMin: z.string().optional(),
  timeMax: z.string().optional(),
  maxResults: z.coerce.number().int().min(1).max(250).optional(),
})

export const recommendationByContextSchema = z.object({
  body: z.object({
    weather: normalizedWeatherSchema.optional(),
    calendar: z.array(normalizedEventSchema).optional(),
    closet: z.array(normalizedClosetItemSchema).min(1).optional(),
    preferences: z.array(z.string()).optional(),
    weatherQuery: weatherQuerySchema.optional(),
    calendarQuery: calendarQuerySchema.optional(),
  }),
})

export const recommendationBySelectionSchema = z.object({
  body: z.object({
    selectedEventType: z.string().min(1, "selectedEventType is required"),
    selectedStyle: z.string().min(1, "selectedStyle is required"),
    closet: z.array(normalizedClosetItemSchema).min(1).optional(),
    preferences: z.array(z.string()).optional(),
    weather: normalizedWeatherSchema.optional(),
    calendar: z.array(normalizedEventSchema).optional(),
    weatherQuery: weatherQuerySchema.optional(),
    calendarQuery: calendarQuerySchema.optional(),
  }),
})
