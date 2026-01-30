import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
export const getWardrobeData = async (userId: number) => {
  const items = await prisma.clothingItem.findMany({
    where: {
      OR: [
        { isDefault: true }, 
        { userId: userId }   
      ]
    },
    orderBy: {
      isDefault: 'desc' 
    }
  });
  return items;
};