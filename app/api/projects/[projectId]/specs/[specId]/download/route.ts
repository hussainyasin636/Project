import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { getProjectAccess } from "@/lib/project-access"
import { fetchSpecContent } from "@/lib/spec-storage"

interface RouteParams {
  params: Promise<{
    projectId: string
    specId: string
  }>
}

/**
 * GET /api/projects/[projectId]/specs/[specId]/download
 * Secure download route that:
 * 1. Authenticates the user
 * 2. Verifies access to the project
 * 3. Verifies the spec belongs to that project
 * 4. Fetches the file using ProjectSpec.filePath
 * 5. Returns it as a downloadable Markdown attachment
 */
export async function GET(_req: Request, { params }: RouteParams) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { projectId, specId } = await params
  if (!projectId || !specId) {
    return NextResponse.json(
      { error: "Invalid project ID or spec ID" },
      { status: 400 }
    )
  }

  // Verify access to the project
  const { hasAccess, project } = await getProjectAccess(projectId)
  if (!hasAccess || !project) {
    return NextResponse.json(
      { error: "Forbidden or project not found" },
      { status: 403 }
    )
  }

  // Verify the spec belongs to that project
  const spec = await prisma.projectSpec.findUnique({
    where: { id: specId },
  })

  if (!spec || spec.projectId !== projectId) {
    return NextResponse.json({ error: "Spec not found" }, { status: 404 })
  }

  // Fetch the file using ProjectSpec.filePath
  const content = await fetchSpecContent(spec.filePath)
  if (content === null) {
    return NextResponse.json(
      { error: "Spec content not found or unavailable" },
      { status: 404 }
    )
  }

  // Format a clean download filename based on project name and spec ID
  const sanitizedProjectName = project.name
    ? project.name
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
    : "project"

  const filename = `${sanitizedProjectName || "project"}-spec-${specId}.md`

  return new NextResponse(content, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-cache, no-store, must-revalidate",
    },
  })
}
