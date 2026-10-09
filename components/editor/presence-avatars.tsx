"use client"

import { useMemo } from "react"
import { useUser } from "@clerk/nextjs"
import { useWorkspace, type PresenceCollaborator } from "@/hooks/use-workspace"

function getInitials(name?: string): string {
  if (!name || !name.trim()) return "?"
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

/**
 * Hook to retrieve active collaborators in the room, excluding the current Clerk user.
 */
export function useCollaborators(): PresenceCollaborator[] {
  const { user } = useUser()
  const workspace = useWorkspace()
  const currentUserId = user?.id
  const collaborators = workspace?.collaborators

  return useMemo(() => {
    const rawCollaborators = collaborators ?? []
    const seen = new Set<string>()
    const result: PresenceCollaborator[] = []

    for (const c of rawCollaborators) {
      if (currentUserId && c.id === currentUserId) {
        continue
      }
      const uniqueKey = c.id || String(c.connectionId)
      if (seen.has(uniqueKey)) {
        continue
      }
      seen.add(uniqueKey)
      result.push(c)
    }

    return result
  }, [collaborators, currentUserId])
}

/**
 * Display-only avatar group for active room participants.
 * Features:
 * - Up to 5 overlapping circular avatars with ring border for contrast
 * - Profile images when available, initials fallback
 * - +N overflow chip when > 5 participants
 * - Sized to match Clerk UserButton (h-7 w-7 sm:h-8 sm:w-8)
 * - Excludes the current Clerk user
 */
export function PresenceAvatars() {
  const collaborators = useCollaborators()

  if (collaborators.length === 0) {
    return null
  }

  const visible = collaborators.slice(0, 5)
  const overflow = collaborators.length - 5

  return (
    <div
      className="flex items-center -space-x-1.5 select-none shrink-0"
      aria-label="Active collaborators"
    >
      {visible.map((collaborator) => {
        const name =
          collaborator.info?.name ||
          collaborator.info?.displayName ||
          "Collaborator"
        const avatarUrl =
          collaborator.info?.avatar || collaborator.info?.avatarUrl
        const color =
          collaborator.info?.color ||
          collaborator.info?.cursorColor ||
          "#00c8d4"
        const initials = getInitials(name)

        return (
          <div
            key={collaborator.connectionId}
            title={name}
            aria-label={name}
            className="relative flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full ring-2 ring-bg-surface overflow-hidden transition-transform hover:z-10 hover:scale-105 pointer-events-none"
            style={{ backgroundColor: color }}
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={name}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-[11px] font-semibold text-white">
                {initials}
              </span>
            )}
          </div>
        )
      })}

      {overflow > 0 && (
        <div
          title={`${overflow} more collaborator${overflow > 1 ? "s" : ""}`}
          aria-label={`${overflow} more collaborators`}
          className="relative flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-bg-elevated border border-border-default ring-2 ring-bg-surface text-[11px] font-semibold text-text-secondary select-none pointer-events-none"
        >
          +{overflow}
        </div>
      )}
    </div>
  )
}
