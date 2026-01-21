import logger from "./logger"
import { prisma } from "@modules/prisma"

export const initializeDatabase = async () => {
  try {
    await prisma.connect()
  } catch (error) {
    logger.error(`Database connection failed: ${error}`)
    process.exit(1)
  }
}
