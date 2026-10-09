"use client"

import { useEffect, useRef } from "react"
import { useOthers } from "@liveblocks/react/suspense"
import { useWorkspace, type PresenceCollaborator } from "@/hooks/use-workspace"

/**
 * Synchronizes active room participants from Liveblocks presence
 * into WorkspaceContext so EditorNavbar can display collaborator avatars.
 * Only triggers updates when participant identity or profile info changes,
 * preventing unnecessary re-renders on high-frequency cursor movements.
 */
export function PresenceSync() {
  const others = useOthers()
  const workspace = useWorkspace()
  const setCollaborators = workspace?.setCollaborators
  const lastSignatureRef = useRef<string>("")

  useEffect(() => {
    if (!setCollaborators) return

    // Signature depends only on participant identity and profile info, not cursor coordinates
    const signature = others
      .map(
        (o) =>
          `${o.connectionId}:${o.id}:${o.info?.name}:${o.info?.displayName}:${o.info?.avatar}:${o.info?.avatarUrl}:${o.info?.color}`
      )
      .join("|")

    if (signature !== lastSignatureRef.current) {
      lastSignatureRef.current = signature
      const mapped: PresenceCollaborator[] = others.map((o) => ({
        connectionId: o.connectionId,
        id: (o.id as string) || "",
        info: o.info as PresenceCollaborator["info"],
      }))
      setCollaborators(mapped)
    }
  }, [others, setCollaborators])

  useEffect(() => {
    return () => {
      if (setCollaborators) {
        setCollaborators([])
      }
    }
  }, [setCollaborators])

  return null
}
