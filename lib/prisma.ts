import "dotenv/config"
import { PrismaClient } from "@/app/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  let databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not defined")
  }

  if (databaseUrl.startsWith("prisma+postgres://")) {
    return new PrismaClient({
      accelerateUrl: databaseUrl,
    })
  }

  // Normalize sslmode=require to sslmode=verify-full for pg/pg-connection-string to silence deprecation security warning
  if (databaseUrl.includes("sslmode=require") && !databaseUrl.includes("uselibpqcompat")) {
    databaseUrl = databaseUrl.replace("sslmode=require", "sslmode=verify-full")
  }

  const adapter = new PrismaPg({ connectionString: databaseUrl })
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}

export { PrismaClient }
export type { Project, ProjectCollaborator, ProjectStatus } from "@/app/generated/prisma/client"
