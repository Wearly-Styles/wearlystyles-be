import type { Request, Response } from "express";
import { SuccessResponse } from "@common/responses/success.response";
import { PostService } from "./post.service";
import { AllPostDTO, UserPostDTO } from "./post.dto";
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
}
