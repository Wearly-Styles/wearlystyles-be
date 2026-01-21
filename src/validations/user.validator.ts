import { z } from "zod"
import { isValidEmail } from "@validations/email.validator"

export const createUserSchema = z.object({
  body: z.object({
    email: z.string().refine(isValidEmail, "Invalid email format"),
    fullName: z.string().optional(),
    avatar: z.string().optional(),
    password: z.string().min(6, "Password must be at least 6 characters"),
  }),
})

export const updateUserSchema = z.object({
  body: z.object({
    fullName: z.string().optional(),
    avatar: z.string().optional(),
  }),
})
