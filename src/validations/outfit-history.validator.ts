import { z } from "zod"

export const createOutfitHistorySchema = z.object({
  body: z.object({
    outfitId: z.coerce.number().int().positive(),
    note: z.string().trim().max(300).optional(),
  }),
})

export const listOutfitHistoriesSchema = z.object({
  query: z.object({
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
  }),
})
