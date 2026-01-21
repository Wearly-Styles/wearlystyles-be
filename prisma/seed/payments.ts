import { PrismaClient, Prisma } from "@prisma/client"
import type { SeedContext } from "./seed.types"

export const seedPayments = async (prisma: PrismaClient, context: SeedContext): Promise<void> => {
  await prisma.payment.create({
    data: {
      userId: context.adminUserId,
      amount: new Prisma.Decimal("19.99"),
      currency: "USD",
      paymentMethod: "card",
      transactionId: "txn_0001",
      status: "paid",
      paidAt: new Date(),
      premiumStart: new Date("2025-12-01"),
      premiumEnd: new Date("2026-12-01"),
    },
  })
}
