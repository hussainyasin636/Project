import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { tasks, auth as triggerAuth } from "@trigger.dev/sdk"
import { prisma } from "@/lib/prisma"
import { getProjectAccess } from "@/lib/project-access"
import type { designTask } from "@/trigger/design-agent"

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: {
    prompt?: unknown
    roomId?: unknown
    projectId?: unknown
  } = {}

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { prompt, roomId, projectId } = body

  if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
    return NextResponse.json(
      { error: "Prompt is required and must be a non-empty string" },
      { status: 400 }
    )
  }

  const resolvedProjectId =
    typeof projectId === "string" && projectId.trim()
      ? projectId.trim()
      : typeof roomId === "string" && roomId.trim()
      ? roomId.trim()
      : null

  const resolvedRoomId =
    typeof roomId === "string" && roomId.trim()
      ? roomId.trim()
      : resolvedProjectId

  if (!resolvedProjectId || !resolvedRoomId) {
    return NextResponse.json(
      { error: "projectId or roomId is required" },
      { status: 400 }
    )
  }

  const { hasAccess } = await getProjectAccess(resolvedProjectId)
  if (!hasAccess) {
    return NextResponse.json(
      { error: "Forbidden or project not found" },
      { status: 403 }
    )
  }

  try {
    const handle = await tasks.trigger<typeof designTask>("design-agent", {
      prompt: prompt.trim(),
      roomId: resolvedRoomId,
      projectId: resolvedProjectId,
    })

    await prisma.taskRun.create({
      data: {
        runId: handle.id,
        projectId: resolvedProjectId,
        userId,
      },
    })

    let publicToken = ""
    try {
      publicToken = await triggerAuth.createPublicToken({
        scopes: {
          read: {
            runs: [handle.id],
          },
        },
      })
    } catch (tokenErr) {
      console.warn("[POST /api/ai/design] Notice: createPublicToken:", tokenErr)
    }

    return NextResponse.json({
      runId: handle.id,
      publicToken,
      token: publicToken,
    })
  } catch (error) {
    console.error("[POST /api/ai/design] Failed to trigger design task:", error)
    return NextResponse.json(
      { error: "Failed to trigger design task" },
      { status: 500 }
    )
  }
}
