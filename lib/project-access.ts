import { cache } from "react"
import { auth, currentUser } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import type { Project, ProjectCollaborator } from "@/types/project"

export interface ClerkIdentity {
  userId: string
  primaryEmail: string | null
  emailAddresses: string[]
}

/**
 * Retrieves the authenticated Clerk identity (userId and emails).
 * Uses React cache to avoid duplicate network calls within the same request.
 * Returns null if the user is unauthenticated.
 */
export const getCurrentUserIdentity = cache(
  async (): Promise<ClerkIdentity | null> => {
    const { userId, sessionClaims } = await auth()
    if (!userId) {
      return null
    }

    // Extract email from sessionClaims if available
    const claims = sessionClaims as Record<string, unknown> | null
    const claimEmail =
      typeof claims?.email === "string"
        ? claims.email.toLowerCase()
        : typeof claims?.primary_email === "string"
        ? claims.primary_email.toLowerCase()
        : null

    let primaryEmail: string | null = claimEmail
    const emailAddresses: string[] = claimEmail ? [claimEmail] : []

    try {
      const user = await currentUser()
      if (user) {
        const userEmails =
          user.emailAddresses
            ?.map((e) => e.emailAddress.toLowerCase())
            .filter(Boolean) || []

        const userPrimary =
          user.emailAddresses
            ?.find((e) => e.id === user.primaryEmailAddressId)
            ?.emailAddress.toLowerCase() ||
          userEmails[0] ||
          null

        if (userPrimary) {
          primaryEmail = userPrimary
        }

        for (const email of userEmails) {
          if (!emailAddresses.includes(email)) {
            emailAddresses.push(email)
          }
        }
      }
    } catch (err: unknown) {
      // Gracefully handle if Clerk Backend API call fails or session user profile is unavailable
      const message = err instanceof Error ? err.message : String(err)
      console.warn("Notice: Clerk currentUser profile could not be loaded:", message)
    }

    return {
      userId,
      primaryEmail,
      emailAddresses,
    }
  }
)

export interface ProjectAccessResult {
  hasAccess: boolean
  isOwner: boolean
  isCollaborator: boolean
  project: (Project & { collaborators: ProjectCollaborator[] }) | null
}

/**
 * Checks project access by owner or collaborator for the given roomId (project ID).
 * If the user is the owner, access is granted directly without remote Clerk network dependencies.
 * If the project does not exist or user has neither owner nor collaborator rights,
 * hasAccess is false and project is null.
 */
export const getProjectAccess = cache(
  async (
    roomId: string,
    identity?: ClerkIdentity | null
  ): Promise<ProjectAccessResult> => {
    const currentIdentity = identity ?? (await getCurrentUserIdentity())

    if (!currentIdentity?.userId) {
      return {
        hasAccess: false,
        isOwner: false,
        isCollaborator: false,
        project: null,
      }
    }

    const project = await prisma.project.findUnique({
      where: { id: roomId },
      include: {
        collaborators: true,
      },
    })

    if (!project) {
      return {
        hasAccess: false,
        isOwner: false,
        isCollaborator: false,
        project: null,
      }
    }

    // Owner check: instantaneous and reliable
    const isOwner = project.ownerId === currentIdentity.userId
    if (isOwner) {
      return {
        hasAccess: true,
        isOwner: true,
        isCollaborator: false,
        project,
      }
    }

    // Collaborator check: only if project has collaborators
    let isCollaborator = false

    if (project.collaborators.length > 0) {
      const allowedEmails = new Set(
        [
          currentIdentity.primaryEmail,
          ...currentIdentity.emailAddresses,
        ].filter((e): e is string => Boolean(e))
      )

      isCollaborator = project.collaborators.some((collab) =>
        allowedEmails.has(collab.email.toLowerCase())
      )
    }

    const hasAccess = isOwner || isCollaborator

    return {
      hasAccess,
      isOwner,
      isCollaborator,
      project: hasAccess ? project : null,
    }
  }
)

// Aliases for flexibility across imports
export const checkProjectAccess = getProjectAccess
export const getClerkIdentity = getCurrentUserIdentity
