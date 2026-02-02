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

export const CreateCategoryDTO = z.object({
  name: z.string().min(1, "Name is required"),
});

export const CreateTagDTO = z.object({
  name: z.string().min(1, "Name is required"),
});

export const listCategoriesDTO = z.object({
  search: z.string().optional(),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? Number(val) : 1))  
    .pipe(z.number().int().positive()),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? Number(val) : 10))
    .pipe(z.number().int().positive()),
});

export const listTagsDTO = z.object({
  search: z.string().optional(),
  page: z 
    .string()
    .optional()
    .transform((val) => (val ? Number(val) : 1))
    .pipe(z.number().int().positive()),
  limit: z
    .string() 
    .optional()
    .transform((val) => (val ? Number(val) : 10))
    .pipe(z.number().int().positive()),
});

export type CreateClothingItemDTO = z.infer<typeof CreateClothingItemDTO>;
