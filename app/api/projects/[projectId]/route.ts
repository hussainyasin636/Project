import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

interface RouteParams {
  params: Promise<{
    projectId: string
  }>
}

export async function PATCH(req: Request, { params }: RouteParams) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { projectId } = await params
  if (!projectId) {
    return NextResponse.json({ error: "Invalid project ID" }, { status: 400 })
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
  })

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  if (project.ownerId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  let body: { name?: unknown } = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (typeof body.name !== "string" || body.name.trim().length === 0) {
    return NextResponse.json(
      { error: "Name is required and cannot be empty" },
      { status: 400 }
    )
  }

  const updatedProject = await prisma.project.update({
    where: { id: projectId },
    data: {
      name: body.name.trim(),
    },
    include: {
      collaborators: true,
    },
  })

  return NextResponse.json(updatedProject)
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { projectId } = await params
  if (!projectId) {
    return NextResponse.json({ error: "Invalid project ID" }, { status: 400 })
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
  })

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  if (project.ownerId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  await prisma.project.delete({
    where: { id: projectId },
  })

  return NextResponse.json({ success: true })
}
