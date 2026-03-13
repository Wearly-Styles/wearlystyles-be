import type { Request, Response } from "express";
import { SuccessResponse } from "@common/responses/success.response";
import { PostService } from "./post.service";
import {
  AllPostDTO,
  UserPostDTO,
  CreatePostDTO,
  UpdatePostDTO,
  DeletePostDTO,
  CommentOnPostDTO,
} from "./post.dto";
import { AppError } from "@common/errors/app-error";
import { ErrorCode } from "@common/enums/error-code.enum";

export class PostController {
  private postService = new PostService();

  async getAllPosts(req: Request, res: Response) {
  try {
    console.log("GET /posts called");

    const user = req.user;

    if (!user) {
      throw new AppError("Unauthorized", 401, ErrorCode.UNAUTHORIZED);
    }

    const posts = await this.postService.getAllPosts(user.id);

    res
      .status(200)
      .json(
        new SuccessResponse(
          "Posts retrieved successfully",
          posts,
          200
        )
      );
  } catch (error) {
    console.error("ERROR getAllPosts:", error);

    if (error instanceof AppError) {
      res.status(error.statusCode).json({ message: error.message });
      return;
    }

    res.status(500).json({ message: "Internal server error" });
  }
}

  async getPostsByUserId(req: Request, res: Response) {
    try {
      console.log("req.user:", req.user);

      // lấy userId từ token (auth middleware)
      const userId = req.user?.id;

      // validate
      if (!userId || Number.isNaN(Number(userId))) {
        throw new AppError("Unauthorized", 401, ErrorCode.UNAUTHORIZED);
      }

      const posts = await this.postService.getPostsByUserId(userId, userId);

      return res
        .status(200)
        .json(new SuccessResponse("Posts retrieved successfully", posts, 200));
    } catch (error) {
      console.error("getPostsByUserId error:", error);

      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          message: error.message,
        });
      }

      return res.status(500).json({
        message: "Internal server error",
      });
    }
  }

  async createPost(req: Request, res: Response) {
    try {
      const user = req.user;
      if (!user)
        throw new AppError("Unauthorized", 401, ErrorCode.UNAUTHORIZED);

      const rawBody = {
        status: req.body.status,
        caption: req.body.caption || null, // convert empty string -> null
      };

      const body = CreatePostDTO.parse(rawBody);

      const result = await this.postService.createPost(user.id, body, req.file);

      res
        .status(201)
        .json(new SuccessResponse("Post created successfully", result, 201));
    } catch (error) {
      console.error("createPost error:", error);

      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
      }

      res.status(500).json({ message: "Internal server error" });
    }
  }

  async updatePost(req: Request, res: Response) {
    try {
      const user = req.user;

      if (!user) {
        throw new AppError("Unauthorized", 401, ErrorCode.UNAUTHORIZED);
      }

      const postId = Number(req.params.id);

      if (Number.isNaN(postId)) {
        throw new AppError("Invalid post ID", 400, ErrorCode.BAD_REQUEST);
      }

      const body = UpdatePostDTO.parse(req.body);

      const result = await this.postService.updatePost(
        postId,
        user.id,
        body,
        req.file,
      );

      res
        .status(200)
        .json(new SuccessResponse("Post updated successfully", result, 200));
    } catch (error) {
      console.error("updatePost error:", error);

      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
      }

      res.status(500).json({ message: "Internal server error" });
    }
  }

  async deletePost(req: Request, res: Response) {
    try {
      const user = req.user;

      if (!user) {
        throw new AppError("Unauthorized", 401, ErrorCode.UNAUTHORIZED);
      }

      const postId = Number(req.params.id);

      if (Number.isNaN(postId)) {
        throw new AppError("Invalid post ID", 400, ErrorCode.BAD_REQUEST);
      }

      await this.postService.deletePost(postId, user.id);

      res
        .status(200)
        .json(new SuccessResponse("Post deleted successfully", null, 200));
    } catch (error) {
      console.error("deletePost error:", error);

      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
      }

      res.status(500).json({ message: "Internal server error" });
    }
  }

  async likePost(req: Request, res: Response) {
    try {
      const user = req.user;

      if (!user) {
        throw new AppError("Unauthorized", 401, ErrorCode.UNAUTHORIZED);
      }

      const postId = Number(req.params.id);

      if (Number.isNaN(postId)) {
        throw new AppError("Invalid post ID", 400, ErrorCode.BAD_REQUEST);
      }

      const result = await this.postService.toggleLike(postId, user.id);

      res
        .status(200)
        .json(
          new SuccessResponse("Post like toggled successfully", result, 200),
        );
    } catch (error) {
      console.error("likePost error:", error);

      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
      }

      res.status(500).json({ message: "Internal server error" });
    }
  }

  async commentOnPost(req: Request, res: Response) {
  try {
    const user = req.user;

    if (!user) {
      throw new AppError("Unauthorized", 401, ErrorCode.UNAUTHORIZED);
    }

    const postId = Number(req.params.id); 

    if (Number.isNaN(postId)) {
      throw new AppError("Invalid post ID", 400, ErrorCode.BAD_REQUEST);
    }

    const body = CommentOnPostDTO.parse(req.body);

    const result = await this.postService.commentOnPost(
      postId,
      user.id,
      body.content
    );

    res
      .status(201)
      .json(new SuccessResponse("Comment added successfully", result, 201));
  } catch (error) {
    console.error("commentOnPost error:", error);

    if (error instanceof AppError) {
      res.status(error.statusCode).json({ message: error.message });
      return;
    }

    res.status(500).json({ message: "Internal server error" });
  }
}
}
