import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const projects = await prisma.project.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: "desc" },
    include: {
      collaborators: true,
    },
  })

  return NextResponse.json(projects)
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: { id?: unknown; name?: unknown; description?: unknown } = {}
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  const name =
    typeof body.name === "string" && body.name.trim().length > 0
      ? body.name.trim()
      : "Untitled Project"

  const description =
    typeof body.description === "string" && body.description.trim().length > 0
      ? body.description.trim()
      : null

  const customId =
    typeof body.id === "string" && body.id.trim().length > 0
      ? body.id.trim()
      : undefined

  const project = await prisma.project.create({
    data: {
      ...(customId ? { id: customId } : {}),
      name,
      description,
      ownerId: userId,
    },
    include: {
      collaborators: true,
    },
  })

  return NextResponse.json(project, { status: 201 })
}
