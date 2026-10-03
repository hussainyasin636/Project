import { cache } from "react"
import { auth, currentUser } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import type { Project, ProjectCollaborator } from "@/types/project"

export interface UserProjects {
  ownedProjects: Project[]
  sharedProjects: Project[]
}

export const getUserProjects = cache(async (): Promise<UserProjects> => {
  const { userId } = await auth()
  if (!userId) {
    return { ownedProjects: [], sharedProjects: [] }
  }

  const ownedProjects = await prisma.project.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: "desc" },
    include: {
      collaborators: true,
    },
  })

  let sharedProjects: Project[] = []
  try {
    const user = await currentUser()
    const userEmails =
      user?.emailAddresses
        ?.map((e) => e.emailAddress.toLowerCase())
        .filter(Boolean) || []

    if (userEmails.length > 0) {
      sharedProjects = await prisma.project.findMany({
        where: {
          ownerId: { not: userId },
          collaborators: {
            some: {
              email: { in: userEmails },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        include: {
          collaborators: true,
        },
      })
    }
  } catch (error) {
    console.error("Failed to fetch shared projects:", error)
  }

  return {
    ownedProjects,
    sharedProjects,
  }
})

export interface ProjectAccessResult {
  project: (Project & { collaborators: ProjectCollaborator[] }) | null
  isOwner: boolean
  isCollaborator: boolean
}

export const getProjectWithAccess = cache(
  async (projectId: string): Promise<ProjectAccessResult> => {
    const { userId } = await auth()
    if (!userId) {
      return { project: null, isOwner: false, isCollaborator: false }
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        collaborators: true,
      },
    })

    if (!project) {
      return { project: null, isOwner: false, isCollaborator: false }
    }

    const isOwner = project.ownerId === userId
    let isCollaborator = false

    if (!isOwner) {
      try {
        const user = await currentUser()
        const userEmails =
          user?.emailAddresses
            ?.map((e) => e.emailAddress.toLowerCase())
            .filter(Boolean) || []

        isCollaborator = project.collaborators.some((c) =>
          userEmails.includes(c.email.toLowerCase())
        )
      } catch (error) {
        console.error("Failed to verify collaborator access:", error)
      }
    }

    if (!isOwner && !isCollaborator) {
      return { project: null, isOwner: false, isCollaborator: false }
    }

    return {
      project,
      isOwner,
      isCollaborator,
    }
  }
)
