"use client"

import { useEffect } from "react"
import { Sparkles, Bot, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useWorkspace } from "@/hooks/use-workspace"
import { ShareDialog } from "@/components/editor/share-dialog"
import { CanvasWrapper } from "@/components/canvas/canvas-wrapper"
import { cn } from "@/lib/utils"
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

  return (
    <div className="relative h-full w-full overflow-hidden bg-bg-base">
      {/* Infinite Canvas: Edge-to-edge background filling the full viewport naturally */}
      <main className="absolute inset-0 h-full w-full overflow-hidden bg-bg-base">
        <CanvasWrapper roomId={project.id} />
      </main>

      {/* Right AI Sidebar: Floating overlay over canvas that does not push or shrink canvas */}
      <aside
        className={cn(
          "fixed right-0 top-12 z-30 flex h-[calc(100vh-3rem)] w-80 flex-col md:w-88",
          "border-l border-border-default bg-bg-surface/95 backdrop-blur-md shadow-2xl",
          "transition-all duration-300 ease-in-out",
          workspace?.isAiSidebarOpen
            ? "translate-x-0 opacity-100 pointer-events-auto"
            : "translate-x-full opacity-0 pointer-events-none invisible"
        )}
        aria-hidden={!workspace?.isAiSidebarOpen}
      >
        {/* Right sidebar header */}
        <div className="flex h-12 items-center justify-between border-b border-border-default px-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent-ai" />
            <span className="text-sm font-semibold text-text-primary">
              AI Assistant
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={workspace?.toggleAiSidebar}
            aria-label="Close AI sidebar"
            className="h-8 w-8 text-text-secondary hover:text-text-primary"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Right sidebar body: placeholder for future AI chat */}
        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center text-text-muted">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border-default bg-bg-elevated text-accent-ai mb-3">
            <Bot className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-medium text-text-primary mb-1">
            AI Assistant
          </h3>
          <p className="text-xs text-text-muted max-w-xs mb-4">
            AI chat and generation workflows will be available here. Prompt
            the AI to generate architecture graphs and technical specs.
          </p>
          <div className="rounded-md border border-border-subtle bg-bg-subtle px-3 py-1.5 text-[11px] text-text-faint font-mono">
            Placeholder • Feature 08
          </div>
        </div>
      </aside>

      {/* Share Dialog */}
      <ShareDialog
        project={project}
        isOwner={isOwner}
        isCollaborator={isCollaborator}
      />
    </div>
  )
}
