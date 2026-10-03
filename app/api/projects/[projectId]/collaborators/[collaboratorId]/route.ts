import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

interface RouteParams {
  params: Promise<{
    projectId: string
    collaboratorId: string
  }>
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { projectId, collaboratorId } = await params
  if (!projectId || !collaboratorId) {
    return NextResponse.json(
      { error: "Invalid project ID or collaborator ID" },
      { status: 400 }
    )
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
  })

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  // Enforce server-side ownership
  if (project.ownerId !== userId) {
    return NextResponse.json(
      { error: "Only the project owner can remove collaborators" },
      { status: 403 }
    )
  }

  const collaborator = await prisma.projectCollaborator.findFirst({
    where: {
      id: collaboratorId,
      projectId,
    },
  })

  if (!collaborator) {
    return NextResponse.json(
      { error: "Collaborator not found" },
      { status: 404 }
    )
  }

  await prisma.projectCollaborator.delete({
    where: {
      id: collaborator.id,
    },
  })

  return NextResponse.json({ success: true })
}
