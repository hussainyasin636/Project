import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { validateSlug } from "@/lib/slug";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projects = await prisma.project.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: "desc" },
    include: {
      collaborators: true,
    },
  });

  return NextResponse.json(projects);
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { id?: unknown; name?: unknown; description?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const projectId = typeof body.id === "string" ? body.id.trim() : undefined;
  if (
    body.id !== undefined &&
    (projectId === undefined || !validateSlug(projectId).isValid)
  ) {
    return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
  }

  const name =
    typeof body.name === "string" && body.name.trim().length > 0
      ? body.name.trim()
      : "Untitled Project";

  const description =
    typeof body.description === "string" && body.description.trim().length > 0
      ? body.description.trim()
      : null;

  let project;
  try {
    project = await prisma.project.create({
      data: {
        ...(projectId ? { id: projectId } : {}),
        name,
        description,
        ownerId: userId,
      },
      include: {
        collaborators: true,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A project with this ID already exists" },
        { status: 409 }
      );
    }
    throw error;
  }

  return NextResponse.json(project, { status: 201 });
}
