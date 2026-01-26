import { z } from "zod";

export const CreateClothingItemDTO = z.object({
  name: z.string().min(1, "Name is required").optional(),
  categoryId: z
    .string()
    .optional()
    .transform((val) => (val ? Number(val) : undefined))
    .pipe(z.number().int().positive().optional()),
  color: z.string().optional(),
  isFavorite: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      return val === "true" || val === "1" || val === "on";
    })
    .pipe(z.boolean().optional()),
  description: z.string().optional(),
  season: z.string().optional(),
  material: z.string().optional(),
});

export type CreateClothingItemDTO = z.infer<typeof CreateClothingItemDTO>;
