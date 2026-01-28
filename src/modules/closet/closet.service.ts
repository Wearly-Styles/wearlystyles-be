import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
export const getWardrobeData = async (userId: number) => {
  let items = await prisma.clothingItem.findMany({
    where: { userId: userId }
  });
  if (items.length === 0) {
    items = await prisma.clothingItem.findMany({
      where: { isDefault: true }
    });
  }
  return items;
};