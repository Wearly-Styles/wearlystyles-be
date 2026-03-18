import { z } from "zod"
import { isValidEmail } from "@validations/email.validator"
import { UserStatus } from "@common/enums/user-status.enum"

export const createUserSchema = z.object({
  body: z.object({
    email: z.string().refine(isValidEmail, "Email must be a valid gmail.com address"),
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

export const updateUserStatusSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    status: z.nativeEnum(UserStatus),
  }),
})
