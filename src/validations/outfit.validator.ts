import { z } from "zod"

export const createOutfitSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    occasion: z.string().optional(),
    weather: z.string().optional(),
    isFavorite: z.boolean().optional(),
    items: z.array(z.coerce.number().int().positive()).min(1, "items is required"),
  }),
})

export const updateOutfitSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    occasion: z.string().optional(),
    weather: z.string().optional(),
    isFavorite: z.boolean().optional(),
    items: z.array(z.coerce.number().int().positive()).min(1).optional(),
  }),
})
