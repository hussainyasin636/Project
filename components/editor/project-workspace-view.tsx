"use client"

import { Pencil, Trash2, Layers, ShieldCheck, UserCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useProjectActions } from "@/hooks/use-project-actions"
import type { Project } from "@/types/project"

interface ProjectWorkspaceViewProps {
  project: Project
  isOwner: boolean
  isCollaborator: boolean
}

export function ProjectWorkspaceView({
  project,
  isOwner,
  isCollaborator,
}: ProjectWorkspaceViewProps) {
  const { openRenameDialog, openDeleteDialog } = useProjectActions()

  return (
    <div className="flex h-[calc(100vh-3rem)] w-full flex-col overflow-hidden bg-bg-base">
      {/* Workspace Top Toolbar / Subheader */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border-default bg-bg-surface/80 px-4 backdrop-blur-xs">
        {/* Left: Project title, status, room ID */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="truncate text-sm font-semibold text-text-primary">
              {project.name}
            </h1>
            <span className="rounded-full border border-border-default bg-bg-subtle px-2 py-0.5 text-[11px] font-medium text-text-secondary">
              {project.status}
            </span>
          </div>

          <span className="hidden sm:inline-block text-border-subtle">|</span>

          <span className="hidden sm:inline-block font-mono text-xs text-text-faint truncate">
            {project.id}
          </span>
        </div>

        {/* Right: Actions and role indicator */}
        <div className="flex items-center gap-2">
          {isOwner && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 px-2.5 text-xs text-text-secondary hover:text-text-primary"
                onClick={() =>
                  openRenameDialog({
                    id: project.id,
                    name: project.name,
                  })
                }
              >
                <Pencil className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Rename</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 px-2.5 text-xs text-state-error/80 hover:bg-state-error/10 hover:text-state-error"
                onClick={() =>
                  openDeleteDialog({
                    id: project.id,
                    name: project.name,
                  })
                }
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Delete</span>
              </Button>
            </div>
          )}

          <div className="flex items-center gap-1.5 rounded-md border border-border-default bg-bg-subtle px-2 py-1 text-[11px] text-text-muted">
            {isOwner ? (
              <>
                <ShieldCheck className="h-3.5 w-3.5 text-accent-primary" />
                <span>Owner</span>
              </>
            ) : isCollaborator ? (
              <>
                <UserCheck className="h-3.5 w-3.5 text-state-success" />
                <span>Collaborator</span>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Canvas Workspace Area */}
      <div className="relative flex flex-1 flex-col items-center justify-center p-6 bg-bg-base [background-image:radial-gradient(var(--border-default)_1px,transparent_1px)] [background-size:24px_24px]">
        <div className="flex max-w-md flex-col items-center gap-4 rounded-2xl border border-border-default bg-bg-surface/90 p-8 text-center shadow-xl backdrop-blur-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border-default bg-bg-elevated text-accent-primary">
            <Layers className="h-6 w-6" />
          </div>

          <div className="flex flex-col gap-1.5">
            <h2 className="text-lg font-semibold text-text-primary">
              {project.name}
            </h2>
            <p className="text-xs text-text-muted">
              Real-time collaborative canvas workspace. Room ID is active and connected.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <div className="flex items-center gap-1.5 rounded-lg border border-border-subtle bg-bg-subtle px-2.5 py-1 font-mono text-[11px] text-text-secondary">
              <span className="text-text-faint">Room:</span>
              <span>{project.id}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
