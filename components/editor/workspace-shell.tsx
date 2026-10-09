"use client"

import { useEffect, useMemo } from "react"
import { useWorkspace } from "@/hooks/use-workspace"
import { ShareDialog } from "@/components/editor/share-dialog"
import { CanvasWrapper } from "@/components/canvas/canvas-wrapper"
import { AiSidebar } from "@/components/editor/ai-sidebar"
import type { Project } from "@/types/project"

interface WorkspaceShellProps {
  project: Project
  isOwner: boolean
  isCollaborator: boolean
}

export function WorkspaceShell({
  project,
  isOwner,
  isCollaborator,
}: WorkspaceShellProps) {
  const workspace = useWorkspace()
  const setActiveProject = workspace?.setActiveProject

  // Sync active project with workspace context for top navbar
  useEffect(() => {
    if (setActiveProject) {
      setActiveProject(project)
    }
    return () => {
      if (setActiveProject) {
        setActiveProject(null)
      }
    }
  }, [project, setActiveProject])

  // Memoize CanvasWrapper so it never re-renders when sidebar toggles or saveStatus changes
  const canvasElement = useMemo(
    () => <CanvasWrapper roomId={project.id} />,
    [project.id]
  )

  return (
    <div className="relative h-full w-full overflow-hidden bg-bg-base">
      {/* Infinite Canvas: Edge-to-edge background filling the full viewport naturally */}
      <main className="absolute inset-0 h-full w-full overflow-hidden bg-bg-base">
        {canvasElement}
      </main>

      {/* Right AI Sidebar: Floating overlay over canvas */}
      <AiSidebar
        isOpen={Boolean(workspace?.isAiSidebarOpen)}
        onClose={workspace?.toggleAiSidebar ?? (() => {})}
      />

      {/* Share Dialog */}
      <ShareDialog
        project={project}
        isOwner={isOwner}
        isCollaborator={isCollaborator}
      />
    </div>
  )
}
