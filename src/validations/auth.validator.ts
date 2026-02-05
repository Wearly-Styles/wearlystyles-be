import { z } from "zod"
import { isValidEmail } from "@validations/email.validator"

export const registerSchema = z.object({
  body: z.object({
    email: z.string().refine(isValidEmail, "Invalid email format"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    fullName: z.string().min(1, "Full name is required").optional(),
  }),
})

export const loginSchema = z.object({
  body: z.object({
    email: z.string().refine(isValidEmail, "Invalid email format"),
    password: z.string().min(1, "Password is required"),
  }),
})

export const googleLoginSchema = z.object({
  body: z.object({
    idToken: z.string().min(1, "idToken is required"),
  }),
})

export const googleCodeLoginSchema = z.object({
  body: z.object({
    code: z.string().min(1, "code is required"),
    redirectUri: z.string().min(1, "redirectUri is required"),
  }),
})

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, "Refresh token is required"),
  }),
})
