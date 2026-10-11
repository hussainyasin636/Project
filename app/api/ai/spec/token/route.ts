import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { auth as triggerAuth } from "@trigger.dev/sdk"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const tokenRequestSchema = z.object({
  runId: z.string().min(1, "runId is required"),
})

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parseResult = tokenRequestSchema.safeParse(body)
  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: "Invalid request payload",
        details: parseResult.error.flatten(),
      },
      { status: 400 }
    )
  }

  const cleanRunId = parseResult.data.runId.trim()

  // Verify the TaskRun exists and belongs to the authenticated user
  const taskRun = await prisma.taskRun.findUnique({
    where: { runId: cleanRunId },
  })

  if (!taskRun || taskRun.userId !== userId) {
    return NextResponse.json(
      { error: "Forbidden or task run not found" },
      { status: 403 }
    )
  }

  try {
    // Issue a Trigger.dev public access token scoped to this run with 1-hour expiration
    const token = await triggerAuth.createPublicToken({
      scopes: {
        read: {
          runs: [cleanRunId],
        },
      },
      expirationTime: "1h",
    })

    return NextResponse.json({ token })
  } catch (error) {
    console.error("[POST /api/ai/spec/token] Failed to create public token:", error)
    return NextResponse.json(
      { error: "Failed to create public token" },
      { status: 500 }
    )
  }
}
