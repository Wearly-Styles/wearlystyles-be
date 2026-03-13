import { z } from "zod";

export const AllPostDTO = z.object({
  id: z.number().int().positive(),

  userId: z.number().int().positive(),

  user: z.object({
    id: z.number(),
    name: z.string(),
    avatar: z.string().nullable().optional(),
  }),

  image: z.string().url().nullable().optional(),

  status: z.string().nullable().optional(),
  caption: z.string().nullable().optional(),

  createdAt: z.date().nullable().optional(),
  updatedAt: z.date().nullable().optional(),

  likes: z.number().int().nonnegative(),
  liked: z.boolean(),

  comments: z.array(
    z.object({
      id: z.number().int().positive(),
      content: z.string().nullable().optional(),
      createdAt: z.date().nullable().optional(),
      updatedAt: z.date().nullable().optional(),

      user: z.object({
        id: z.number(),
        name: z.string(),
        avatar: z.string().nullable().optional(),
      }),
    }),
  ),
});

export const UserPostDTO = z.object({
  id: z.number().int().positive(),

  userId: z.number().int().positive(),

  user: z.object({
    id: z.number(),
    name: z.string(),
    avatar: z.string().nullable().optional(),
  }),

  image: z.string().url().nullable().optional(),

  status: z.string().nullable().optional(),
  caption: z.string().nullable().optional(),

  createdAt: z.date().nullable().optional(),
  updatedAt: z.date().nullable().optional(),

  likes: z.number().int().nonnegative(),
  liked: z.boolean(),

  comments: z.array(
    z.object({
      id: z.number().int().positive(),
      content: z.string().nullable().optional(),
      createdAt: z.date().nullable().optional(),
      updatedAt: z.date().nullable().optional(),

      user: z.object({
        id: z.number(),
        name: z.string(),
        avatar: z.string().nullable().optional(),
      }),
    }),
  ),
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

export const LikePostDTO = z.object({
  postId: z.number().int().positive(),
});

export const CommentOnPostDTO = z.object({
  // postId: z.number().int().positive(),
  content: z.string().min(1),
});

export type CreatePostInput = z.infer<typeof CreatePostDTO>;
export type UpdatePostInput = z.infer<typeof UpdatePostDTO>;
export type LikePostInput = z.infer<typeof LikePostDTO>;
export type CommentOnPostInput = z.infer<typeof CommentOnPostDTO>;
