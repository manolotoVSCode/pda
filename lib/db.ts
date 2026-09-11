import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const connectionString = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/conductual'

function makePrisma() {
  const adapter = new PrismaPg({ connectionString })
  return new PrismaClient({ adapter })
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const db = globalForPrisma.prisma ?? makePrisma()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
