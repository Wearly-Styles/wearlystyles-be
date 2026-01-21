import type { PrismaClient } from "@prisma/client"
import type { SeedContext } from "./seed.types"

export const seedUserProfiles = async (prisma: PrismaClient, context: SeedContext): Promise<void> => {
  await prisma.userProfile.upsert({
    where: { userId: context.adminUserId },
    update: {},
    create: {
      userId: context.adminUserId,
      fullName: "Admin User",
      avatar: "https://example.com/avatar-admin.png",
      preferences: "dark-mode=true;notifications=all",
      isPremium: true,
      gender: "male",
      birthday: new Date("1990-01-01"),
      location: "Ho Chi Minh City",
    },
  })

  await prisma.userProfile.upsert({
    where: { userId: context.regularUserId },
    update: {},
    create: {
      userId: context.regularUserId,
      fullName: "Regular User",
      avatar: "https://example.com/avatar-user.png",
      preferences: "dark-mode=false;notifications=mentions",
      isPremium: false,
      gender: "female",
      birthday: new Date("1995-06-15"),
      location: "Ha Noi",
    },
  })
}
