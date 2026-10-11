import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { auth as triggerAuth } from "@trigger.dev/sdk"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: { runId?: unknown } = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { runId } = body
  if (!runId || typeof runId !== "string" || !runId.trim()) {
    return NextResponse.json(
      { error: "runId is required and must be a non-empty string" },
      { status: 400 }
    )
  }

  const cleanRunId = runId.trim()

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
    const token = await triggerAuth.createPublicToken({
      scopes: {
        read: {
          runs: [cleanRunId],
        },
      },
    })

    return NextResponse.json({ token })
  } catch (error) {
    console.error("[POST /api/ai/design/token] Failed to create public token:", error)
    return NextResponse.json(
      { error: "Failed to create public token" },
      { status: 500 }
    )
  }
}
