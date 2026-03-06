import type { Request, Response } from "express";
import { SuccessResponse } from "@common/responses/success.response";
import { PostService } from "./post.service";
import { AllPostDTO, UserPostDTO, CreatePostDTO, UpdatePostDTO, DeletePostDTO } from "./post.dto";
import { AppError } from "@common/errors/app-error";
import { ErrorCode } from "@common/enums/error-code.enum";

export class PostController {
  private postService = new PostService();

  async getAllPosts(req: Request, res: Response) {
    try {
      console.log("GET /posts called");

      const posts = await this.postService.getAllPosts();

      console.log("Posts result:", posts);

      res
        .status(200)
        .json(new SuccessResponse("Posts retrieved successfully", posts, 200));
    } catch (error) {
      console.error("ERROR getAllPosts:", error);

      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
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

      const posts = await this.postService.getPostsByUserId(Number(userId));

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

    if (!user) {
      throw new AppError("Unauthorized", 401, ErrorCode.UNAUTHORIZED);
    }

    const body = CreatePostDTO.parse(req.body);

    const result = await this.postService.createPost(
      user.id,
      body,
      req.file
    );

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
      req.file
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
      
}
