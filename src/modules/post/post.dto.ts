import { User } from './../../../generated/prisma/index.d';
import {z} from "zod";

export const AllPostDTO = z.object({
  id: z.number().int().positive(),
  userId: z.number().int().positive(),
  image : z.string().url().nullable().optional(),
  status: z.string(),
  caption: z.string().optional(),
  createdAt: z.date().nullable().optional(),
  updatedAt: z.date().nullable().optional(),
  likes: z.number().int().nonnegative(),
  comments: z.array(z.object({
    id: z.number().int().positive(),
    content: z.string(),
    createdAt: z.date().nullable().optional(),
    updatedAt: z.date().nullable().optional(),
  })),
}); 

export const UserPostDTO = z.object({
  id: z.number().int().positive(),
  userId: z.number().int().positive(),
  image : z.string().url().nullable().optional(),
    status: z.string(),
    caption: z.string().nullable().optional(),
    createdAt: z.date().nullable().optional(),
    updatedAt: z.date().nullable().optional(),
    likes: z.number().int().nonnegative(),
    comments: z.array(z.object({
        id: z.number().int().positive(),
        content: z.string(),
        createdAt: z.date().nullable().optional(),
        updatedAt: z.date().nullable().optional(),
    })),
});

export const CreatePostDTO = z.object({
  status: z.string().min(1),
  caption: z.string().nullable().optional(),
});

export const UpdatePostDTO = z.object({
  status: z.string().optional(),
  caption: z.string().nullable().optional(),
});

export const DeletePostDTO = z.object({
  id: z.number().int().positive(),
});

export type CreatePostInput = z.infer<typeof CreatePostDTO>;
export type UpdatePostInput = z.infer<typeof UpdatePostDTO>;
