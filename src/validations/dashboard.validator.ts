import { z } from "zod"

export const dashboardMetricsSchema = z.object({
  query: z.object({
    days: z.coerce.number().int().min(1).max(90).optional(),
  }),
})

