import { PrismaClient } from "@prisma/client";
import { CloudinaryService } from "@common/utils/cloudinary.util";
import { AppError } from "@common/errors/app-error";
import { ErrorCode } from "@common/enums/error-code.enum";
import { MESSAGES } from "@common/constants/messages.constant";
import { ProfileDTO, UpdateProfileInput } from "./profile.dto";

export class ProfileService {
  private prisma = new PrismaClient();
  private cloudinaryService = new CloudinaryService();

  async getProfileById(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
    if (!user) {
      throw new AppError(MESSAGES.USER_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    }
    return ProfileDTO.parse({
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      profile: user.profile
        ? {
            fullName: user.profile.fullName,
            avatar: user.profile.avatar,
            bio: user.profile.preferences,
            gender: user.profile.gender,
            dateOfBirth: user.profile.birthday,
            location: user.profile.location,
          }
        : null,
    });
  }

  async updateProfile(
    userId: number,
    data: UpdateProfileInput,
    file?: Express.Multer.File,
  ) {
    let avatarUrl: string | undefined;

    if (file) {
      avatarUrl = await this.cloudinaryService.uploadFile(file);
    }

    if (data.email) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { email: data.email },
      });
    }

    const profile = await this.prisma.userProfile.upsert({
      where: { userId },
      create: {
        userId,
        fullName: data.fullName,
        preferences: data.preferences,
        gender: data.gender,
        birthday: data.dateOfBirth,
        location: data.location,
        avatar: avatarUrl,
      },
      update: {
        fullName: data.fullName,
        preferences: data.preferences,
        gender: data.gender,
        birthday: data.dateOfBirth,
        location: data.location,
        ...(avatarUrl && { avatar: avatarUrl }),
      },
    });

    return profile;
  }
}
