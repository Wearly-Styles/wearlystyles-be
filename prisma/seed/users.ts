import type { PrismaClient } from "@prisma/client"
import { hashPassword } from "../../src/common/utils/hash.util"
import { ROLES } from "../../src/common/constants/roles.constant"
import { UserStatus } from "../../src/common/enums/user-status.enum"
import type { SeedContext } from "./seed.types"

export const seedUsers = async (prisma: PrismaClient): Promise<Pick<SeedContext, "adminUserId" | "regularUserId">> => {
  const admin = await prisma.user.upsert({
    where: { email: "admin@wearly.com" },
    update: {},
    create: {
      email: "admin@wearly.com",
      password: await hashPassword("Admin@123"),
      role: ROLES.ADMIN,
      status: UserStatus.ACTIVE,
    },
  })

  const user = await prisma.user.upsert({
    where: { email: "user@wearly.com" },
    update: {},
    create: {
      email: "user@wearly.com",
      password: await hashPassword("User@123"),
      role: ROLES.USER,
      status: UserStatus.ACTIVE,
    },
  })

  return { adminUserId: admin.id, regularUserId: user.id }
}
