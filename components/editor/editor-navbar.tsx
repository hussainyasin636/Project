"use client"

import { useMemo } from "react"
import { usePathname } from "next/navigation"
import { PanelLeftClose, PanelLeftOpen, Share2, Sparkles } from "lucide-react"
import { UserButton } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { useWorkspace } from "@/hooks/use-workspace"
import { cn } from "@/lib/utils"
import type { Project } from "@/types/project"

interface EditorNavbarProps {
  isSidebarOpen: boolean
  onToggleSidebar: () => void
  ownedProjects?: Project[]
  sharedProjects?: Project[]
  className?: string
}

export function EditorNavbar({
  isSidebarOpen,
  onToggleSidebar,
  ownedProjects = [],
  sharedProjects = [],
  className,
}: EditorNavbarProps) {
  const pathname = usePathname()
  const workspace = useWorkspace()

  // Determine current project context from workspace state or current route
  const currentProject = useMemo(() => {
    if (workspace?.activeProject) {
      return workspace.activeProject
    }
    const match = pathname.match(/^\/editor\/([^/]+)$/)
    if (match) {
      const roomId = match[1]
      return (
        ownedProjects.find((p) => p.id === roomId) ||
        sharedProjects.find((p) => p.id === roomId) ||
        null
      )
    }
    return null
  }, [workspace?.activeProject, pathname, ownedProjects, sharedProjects])

  const isWorkspace = Boolean(currentProject || pathname.match(/^\/editor\/[^/]+$/))
  const projectName = currentProject?.name

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 flex h-12 items-center justify-between border-b border-border-default bg-bg-surface px-3",
        className
      )}
    >
      {/* Left section: Sidebar toggle + project name */}
      <div className="flex items-center gap-3 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
          className="shrink-0 text-text-secondary hover:text-text-primary"
        >
          {isSidebarOpen ? (
            <PanelLeftClose className="h-5 w-5" />
          ) : (
            <PanelLeftOpen className="h-5 w-5" />
          )}
        </Button>

        {isWorkspace && projectName && (
          <div className="flex items-center gap-2 min-w-0">
            <span className="hidden sm:inline-block text-border-subtle" aria-hidden="true">
              /
            </span>
            <span
              className="truncate text-sm font-semibold text-text-primary"
              title={projectName}
            >
              {projectName}
            </span>
          </div>
        )}
      </div>

      {/* Center section */}
      <div className="flex flex-1 items-center justify-center px-2" />

      {/* Right section: Workspace actions + UserButton */}
      <div className="flex items-center gap-2 shrink-0">
        {isWorkspace && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={workspace?.openShareDialog}
              className="h-8 gap-1.5 px-3 text-xs border-border-default bg-bg-surface hover:bg-bg-subtle text-text-primary"
              title="Share project"
            >
              <Share2 className="h-3.5 w-3.5 text-text-secondary" />
              <span className="hidden sm:inline">Share</span>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={workspace?.toggleAiSidebar}
              className={cn(
                "h-8 w-8 text-text-secondary hover:text-text-primary hover:bg-bg-subtle",
                workspace?.isAiSidebarOpen && "bg-bg-subtle text-accent-ai"
              )}
              aria-label={
                workspace?.isAiSidebarOpen
                  ? "Close AI sidebar"
                  : "Open AI sidebar"
              }
              title="Toggle AI Sidebar"
            >
              <Sparkles className="h-4 w-4" />
            </Button>
          </>
        )}

        <UserButton />
      </div>
    </header>
  )
}
