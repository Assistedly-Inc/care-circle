import { PrismaClient } from '@prisma/client';

// Prisma client is a singleton to avoid multiple connections in dev with hot reload
let prisma: PrismaClient;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  // In dev we attach the client to the global object to preserve across module reloads
  // @ts-ignore
  if (!global.__prisma) {
    // @ts-ignore
    global.__prisma = new PrismaClient();
  }
  // @ts-ignore
  prisma = global.__prisma;
}

export { prisma };
