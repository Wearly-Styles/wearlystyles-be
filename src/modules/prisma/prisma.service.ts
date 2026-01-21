import { PrismaClient } from "@prisma/client"
import logger from "@config/logger"

export class PrismaService extends PrismaClient {
  async connect(): Promise<void> {
    await this.$connect()
    logger.info("Database connection established successfully")
  }

  async disconnect(): Promise<void> {
    await this.$disconnect()
  }
}
