import { z } from "zod";

export const ProfileInfoDTO = z.object({
  fullName: z.string().optional(),
  avatar: z.string().url().optional(),
  bio: z.string().optional(),
  gender: z.string().optional(),
  dateOfBirth: z.date().optional(),
  location: z.string().optional(),
});

export const ProfileDTO = z.object({
  id: z.number().int().positive(),
  email: z.string().email(),
  role: z.string(),
  status: z.string().optional(),
  profile: ProfileInfoDTO.nullable(),
});

export const UpdateProfileDTO = z.object({
  email: z.string().email().optional(),
  fullName: z.string().optional(),
  preferences: z.string().optional(),
  gender: z.string().optional(),
  dateOfBirth: z.preprocess(
    (val) => (val ? new Date(val as string) : undefined),
    z.date().optional(),
  ),
  location: z.string().optional(),
});

export type ProfileResponse = z.infer<typeof ProfileDTO>;
export type UpdateProfileInput = z.infer<typeof UpdateProfileDTO>;
