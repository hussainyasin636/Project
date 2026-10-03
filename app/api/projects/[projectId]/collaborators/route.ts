import { NextResponse } from "next/server"
import { auth, clerkClient } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

interface RouteParams {
  params: Promise<{
    projectId: string
  }>
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function GET(_req: Request, { params }: RouteParams) {
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
    include: {
      collaborators: {
        orderBy: { createdAt: "asc" },
      },
    },
  })

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  const client = await clerkClient()

  // Verify access: owner or collaborator
  const isOwner = project.ownerId === userId
  let isCollaborator = false

  if (!isOwner) {
    try {
      const currentUser = await client.users.getUser(userId)
      const userEmails =
        currentUser.emailAddresses
          ?.map((e) => e.emailAddress.toLowerCase())
          .filter(Boolean) || []
      isCollaborator = project.collaborators.some((c) =>
        userEmails.includes(c.email.toLowerCase())
      )
    } catch (err) {
      console.error("Failed to verify user access with Clerk:", err)
    }
  }

  if (!isOwner && !isCollaborator) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Fetch owner data from Clerk
  let ownerUser: { name: string | null; email: string | null; avatarUrl: string | null } = {
    name: null,
    email: null,
    avatarUrl: null,
  }

  try {
    const owner = await client.users.getUser(project.ownerId)
    if (owner) {
      const primaryEmail =
        owner.emailAddresses.find((e) => e.id === owner.primaryEmailAddressId)
          ?.emailAddress ||
        owner.emailAddresses[0]?.emailAddress ||
        null

      ownerUser = {
        name:
          [owner.firstName, owner.lastName].filter(Boolean).join(" ") ||
          owner.username ||
          null,
        email: primaryEmail,
        avatarUrl: owner.imageUrl || null,
      }
    }
  } catch (err) {
    console.error("Failed to fetch owner details from Clerk:", err)
  }

  // Enrich collaborator emails with Clerk user data
  const collaboratorEmails = project.collaborators.map((c) => c.email.toLowerCase())
  const clerkUsersByEmail = new Map<string, { name: string | null; avatarUrl: string | null }>()

  if (collaboratorEmails.length > 0) {
    try {
      const usersList = await client.users.getUserList({
        emailAddress: collaboratorEmails,
        limit: 100,
      })

      for (const u of usersList.data) {
        const name =
          [u.firstName, u.lastName].filter(Boolean).join(" ") ||
          u.username ||
          null
        const avatarUrl = u.imageUrl || null

        for (const emailObj of u.emailAddresses) {
          clerkUsersByEmail.set(emailObj.emailAddress.toLowerCase(), {
            name,
            avatarUrl,
          })
        }
      }
    } catch (err) {
      console.error("Failed to enrich collaborator emails with Clerk:", err)
    }
  }

  const enrichedCollaborators = project.collaborators.map((c) => {
    const clerkData = clerkUsersByEmail.get(c.email.toLowerCase())
    return {
      id: c.id,
      projectId: c.projectId,
      email: c.email,
      createdAt: c.createdAt,
      name: clerkData?.name || null,
      avatarUrl: clerkData?.avatarUrl || null,
    }
  })

  return NextResponse.json({
    owner: {
      id: project.ownerId,
      ...ownerUser,
    },
    collaborators: enrichedCollaborators,
  })
}

export async function POST(req: Request, { params }: RouteParams) {
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
    include: {
      collaborators: true,
    },
  })

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  // Enforce server-side ownership
  if (project.ownerId !== userId) {
    return NextResponse.json(
      { error: "Only the project owner can invite collaborators" },
      { status: 403 }
    )
  }

  let body: { email?: unknown } = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (typeof body.email !== "string" || !EMAIL_REGEX.test(body.email.trim().toLowerCase())) {
    return NextResponse.json(
      { error: "A valid email address is required" },
      { status: 400 }
    )
  }

  const normalizedEmail = body.email.trim().toLowerCase()

  const client = await clerkClient()

  // Verify owner is not inviting their own email
  try {
    const owner = await client.users.getUser(userId)
    const ownerEmails =
      owner.emailAddresses?.map((e) => e.emailAddress.toLowerCase()) || []
    if (ownerEmails.includes(normalizedEmail)) {
      return NextResponse.json(
        { error: "You cannot invite yourself as a collaborator" },
        { status: 400 }
      )
    }
  } catch (err) {
    console.error("Failed to check owner email:", err)
  }

  // Check if already invited
  const existing = project.collaborators.find(
    (c) => c.email.toLowerCase() === normalizedEmail
  )
  if (existing) {
    return NextResponse.json(
      { error: "This user is already a collaborator" },
      { status: 409 }
    )
  }

  // Store in database
  const newCollaborator = await prisma.projectCollaborator.create({
    data: {
      projectId,
      email: normalizedEmail,
    },
  })

  // Enrich with Clerk if user exists
  let name: string | null = null
  let avatarUrl: string | null = null

  try {
    const usersList = await client.users.getUserList({
      emailAddress: [normalizedEmail],
      limit: 1,
    })
    if (usersList.data.length > 0) {
      const u = usersList.data[0]
      name =
        [u.firstName, u.lastName].filter(Boolean).join(" ") ||
        u.username ||
        null
      avatarUrl = u.imageUrl || null
    }
  } catch (err) {
    console.error("Failed to lookup Clerk user for new collaborator:", err)
  }

  return NextResponse.json(
    {
      id: newCollaborator.id,
      projectId: newCollaborator.projectId,
      email: newCollaborator.email,
      createdAt: newCollaborator.createdAt,
      name,
      avatarUrl,
    },
    { status: 201 }
  )
}

export async function DELETE(req: Request, { params }: RouteParams) {
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

  // Enforce server-side ownership
  if (project.ownerId !== userId) {
    return NextResponse.json(
      { error: "Only the project owner can remove collaborators" },
      { status: 403 }
    )
  }

  const url = new URL(req.url)
  let collaboratorId = url.searchParams.get("collaboratorId")

  if (!collaboratorId) {
    try {
      const body = await req.json()
      collaboratorId = body.collaboratorId
    } catch {
      // Body is optional if searchParams provided
    }
  }

  if (!collaboratorId || typeof collaboratorId !== "string") {
    return NextResponse.json(
      { error: "Collaborator ID is required" },
      { status: 400 }
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
