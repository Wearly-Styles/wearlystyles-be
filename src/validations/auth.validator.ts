import { z } from "zod"
import { isValidEmail } from "@validations/email.validator"

export const googleAuthSchema = z.object({
  body: z.object({
    authCode: z.string().min(1, 'Authorization code is required'),
  }),
});

export type GoogleAuthInput = z.infer<typeof googleAuthSchema>;

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

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, "Refresh token is required"),
  }),
})
