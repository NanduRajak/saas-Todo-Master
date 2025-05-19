import { PrismaClient } from "@prisma/client";

const prismaClientSingle = () => {
  return new PrismaClient();
};

type prismaClientSingle = ReturnType<typeof prismaClientSingle>;
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prisma = globalForPrisma.prisma ?? prismaClientSingle();

export default prisma;

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
