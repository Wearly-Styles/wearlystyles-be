import { z } from "zod"

const isValidDate = (value: string) => !Number.isNaN(new Date(value).getTime())

const outfitPlanItemSchema = z.object({
  outfitId: z.coerce.number().int().positive(),
  planDate: z.string().min(1, "planDate is required").refine(isValidDate, {
    message: "planDate must be a valid ISO date string",
  }),
  planType: z.string().optional(),
  reminderSent: z.boolean().optional(),
})

export const createOutfitPlansSchema = z.object({
  body: z.object({
    items: z.array(outfitPlanItemSchema).min(1, "items is required"),
  }),
})

export const listOutfitPlansSchema = z.object({
  query: z.object({
    from: z.string().optional(),
    to: z.string().optional(),
  }),
})

export const updateOutfitPlanSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z
    .object({
      outfitId: z.coerce.number().int().positive().optional(),
      planDate: z.string().optional().refine((value) => (value ? isValidDate(value) : true), {
        message: "planDate must be a valid ISO date string",
      }),
      planType: z.string().optional(),
      reminderSent: z.boolean().optional(),
    })
    .refine((value) => Object.keys(value).length > 0, {
      message: "At least one field must be provided",
    }),
})
