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

function getPrismaClient(): PrismaClient {
  // In development, Next.js HMR preserves globalThis across module reloads.
  // If models were added to schema (like projectSpec), ensure the cached instance is not stale.
  if (
    globalForPrisma.prisma &&
    "projectSpec" in globalForPrisma.prisma &&
    "taskRun" in globalForPrisma.prisma
  ) {
    return globalForPrisma.prisma
  }

  const client = createPrismaClient()
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client
  }
  return client
}

// In development, Next.js module caching can preserve a stale PrismaClient on globalThis.
// A Proxy guarantees that any model access auto-refreshes if newer models were generated.
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrismaClient()
    const value = Reflect.get(client, prop, receiver)
    if (typeof value === "function") {
      return value.bind(client)
    }
    return value
  },
})

export { PrismaClient }
export type { Project, ProjectCollaborator, ProjectStatus, TaskRun, ProjectSpec } from "@/app/generated/prisma/client"
