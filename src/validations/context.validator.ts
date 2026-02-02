import { z } from "zod"

export const weatherSchema = z.object({
  query: z.object({
    lat: z.coerce.number(),
    lon: z.coerce.number(),
    datetime: z.string().optional(),
  }),
})

export const calendarSchema = z.object({
  body: z.object({
    accessToken: z.string().min(1, "Google access token is required"),
    timeMin: z.string().optional(),
    timeMax: z.string().optional(),
    maxResults: z.coerce.number().int().min(1).max(250).optional(),
  }),
})
