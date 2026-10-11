import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { getProjectAccess } from "@/lib/project-access"
import { saveProjectSpec } from "@/lib/spec-storage"
import { z } from "zod"

interface RouteParams {
  params: Promise<{
    projectId: string
  }>
}

const saveSpecSchema = z.object({
  content: z.string().min(1, "content is required and must not be empty"),
  specId: z.string().optional(),
})

/**
 * GET /api/projects/[projectId]/specs
 * Lists all generated specs for the specified project.
 */
export async function GET(_req: Request, { params }: RouteParams) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { projectId } = await params
  if (!projectId) {
    return NextResponse.json({ error: "Invalid project ID" }, { status: 400 })
  }

  const { hasAccess } = await getProjectAccess(projectId)
  if (!hasAccess) {
    return NextResponse.json(
      { error: "Forbidden or project not found" },
      { status: 403 }
    )
  }

  const specs = await prisma.projectSpec.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ specs })
}

/**
 * POST /api/projects/[projectId]/specs
 * Saves a generated Markdown spec to Vercel Blob and records metadata in Prisma.
 */
export async function POST(req: Request, { params }: RouteParams) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { projectId } = await params
  if (!projectId) {
    return NextResponse.json({ error: "Invalid project ID" }, { status: 400 })
  }

  const { hasAccess } = await getProjectAccess(projectId)
  if (!hasAccess) {
    return NextResponse.json(
      { error: "Forbidden or project not found" },
      { status: 403 }
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parseResult = saveSpecSchema.safeParse(body)
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Invalid request payload", details: parseResult.error.flatten() },
      { status: 400 }
    )
  }

  const { content, specId } = parseResult.data

  try {
    const spec = await saveProjectSpec(projectId, content, specId)
    return NextResponse.json({ spec })
  } catch (err) {
    console.error("[POST /api/projects/[projectId]/specs] Failed to save spec:", err)
    return NextResponse.json(
      { error: "Failed to persist spec" },
      { status: 500 }
    )
  }
}
