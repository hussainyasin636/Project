import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { tasks } from "@trigger.dev/sdk"
import { prisma } from "@/lib/prisma"
import { getProjectAccess } from "@/lib/project-access"
import { z } from "zod"
import type { generateSpec } from "@/trigger/generate-spec"

const specRequestSchema = z.object({
  roomId: z.string().min(1, "roomId is required"),
  chatHistory: z.array(z.unknown()).optional().default([]),
  nodes: z.array(z.unknown()).optional().default([]),
  edges: z.array(z.unknown()).optional().default([]),
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

  const parseResult = specRequestSchema.safeParse(body)
  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: "Invalid request payload",
        details: parseResult.error.flatten(),
      },
      { status: 400 }
    )
  }

  const { roomId, chatHistory, nodes, edges } = parseResult.data

  // Resolve project access strictly from roomId and authenticated user.
  // Never trust a client-supplied projectId.
  const { hasAccess, project } = await getProjectAccess(roomId)
  if (!hasAccess || !project) {
    return NextResponse.json(
      { error: "Forbidden or project not found" },
      { status: 403 }
    )
  }

  const resolvedProjectId = project.id

  try {
    const handle = await tasks.trigger<typeof generateSpec>("generate-spec", {
      projectId: resolvedProjectId,
      roomId,
      chatHistory,
      nodes,
      edges,
    })

    // Save a TaskRun record for ownership and access control
    await prisma.taskRun.create({
      data: {
        runId: handle.id,
        projectId: resolvedProjectId,
        userId,
      },
    })

    return NextResponse.json({
      runId: handle.id,
    })
  } catch (error) {
    console.error("[POST /api/ai/spec] Failed to trigger generate-spec task:", error)
    return NextResponse.json(
      { error: "Failed to trigger specification generation task" },
      { status: 500 }
    )
  }
}
