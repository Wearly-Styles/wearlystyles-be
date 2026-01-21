import { prisma } from "../../src/modules/prisma"
import logger from "../../src/config/logger"
import { seedUsers } from "./users"
import { seedUserProfiles } from "./user-profiles"
import { seedCategories } from "./categories"
import { seedTags } from "./tags"
import { seedClothingItems } from "./clothing-items"
import { seedClothingItemTags } from "./clothing-item-tags"
import { seedOutfits } from "./outfits"
import { seedOutfitItems } from "./outfit-items"
import { seedOutfitPlans } from "./outfit-plans"
import { seedOutfitHistories } from "./outfit-histories"
import { seedPosts } from "./posts"
import { seedComments } from "./comments"
import { seedLikes } from "./likes"
import { seedFollows } from "./follows"
import { seedNotifications } from "./notifications"
import { seedPayments } from "./payments"
import type { SeedContext } from "./seed.types"

const seedDatabase = async () => {
  try {
    await prisma.connect()

    const context = {} as SeedContext
    Object.assign(context, await seedUsers(prisma))
    await seedUserProfiles(prisma, context)

    Object.assign(context, await seedCategories(prisma))
    Object.assign(context, await seedTags(prisma))
    Object.assign(context, await seedClothingItems(prisma, context))
    await seedClothingItemTags(prisma, context)

    Object.assign(context, await seedOutfits(prisma, context))
    await seedOutfitItems(prisma, context)
    await seedOutfitPlans(prisma, context)
    await seedOutfitHistories(prisma, context)

    Object.assign(context, await seedPosts(prisma, context))
    await seedComments(prisma, context)
    await seedLikes(prisma, context)
    await seedFollows(prisma, context)
    await seedNotifications(prisma, context)
    await seedPayments(prisma, context)

    logger.info("Seed data created successfully")
  } catch (error) {
    logger.error(`Database seeding failed: ${error}`)
    process.exit(1)
  } finally {
    await prisma.disconnect()
  }
}

seedDatabase()
