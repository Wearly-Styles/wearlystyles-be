import type { Request, Response, NextFunction } from "express";
import { SuccessResponse } from "@common/responses/success.response";
import type { RequestUser } from "@common/interfaces/request-user.interface";
import { ProfileService } from "./profile.sevice";
import { AppError } from "@common/errors/app-error";
import { ErrorCode } from "@common/enums/error-code.enum";
import { UpdateProfileDTO } from "./profile.dto";

export class ProfileController {
  private profileService = new ProfileService();

  async getProfileById(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user as RequestUser;

      const profile = await this.profileService.getProfileById(user.id);

      res
        .status(200)
        .json(
          new SuccessResponse("Profile retrieved successfully", profile, 200),
        );
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user as RequestUser;

    const data = UpdateProfileDTO.parse(req.body);
    const file = req.file;

    if (file) {
      const allowedMimes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
      ];

      if (!allowedMimes.includes(file.mimetype)) {
        throw new AppError(
          "Unsupported image format. Only JPEG, PNG, GIF, and WebP are allowed.",
          400,
          ErrorCode.BAD_REQUEST,
        );
      }
    }

    const result = await this.profileService.updateProfile(
      user.id,
      data,
      file,
    );

    res.status(200).json(
      new SuccessResponse("Profile updated successfully", result, 200),
    );
  } catch (error) {
    next(error);
  }
}

}
