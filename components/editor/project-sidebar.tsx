"use client"

import { X, Plus, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { useProjectDialogs } from "@/hooks/use-project-dialogs"
import { cn } from "@/lib/utils"

interface ProjectSidebarProps {
  isOpen: boolean
  onClose: () => void
  className?: string
}

export function ProjectSidebar({ isOpen, onClose, className }: ProjectSidebarProps) {
  const { projects, openCreateDialog, openRenameDialog, openDeleteDialog } =
    useProjectDialogs()

  const ownedProjects = projects.filter((p) => p.isOwner)
  const sharedProjects = projects.filter((p) => !p.isOwner)

  return (
    <>
      {/* Mobile backdrop scrim — tapping outside closes the sidebar */}
      {isOpen && (
        <div
          className="fixed inset-0 top-12 z-20 bg-black/60 backdrop-blur-xs md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Floating overlay — does not push page content */}
      <aside
        className={cn(
          "fixed left-0 top-12 z-30 flex h-[calc(100vh-3rem)] w-72 flex-col",
          "bg-bg-surface border-r border-border-default",
          "transition-transform duration-200 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full",
          className
        )}
        aria-hidden={!isOpen}
      >
        {/* Header */}
        <div className="flex h-12 items-center justify-between border-b border-border-default px-4">
          <span className="text-sm font-semibold text-text-primary">Projects</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4 text-text-secondary" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex flex-1 flex-col overflow-hidden p-3">
          <Tabs defaultValue="my-projects" className="flex flex-1 flex-col">
            <TabsList className="w-full">
              <TabsTrigger value="my-projects" className="flex-1">
                My Projects
              </TabsTrigger>
              <TabsTrigger value="shared" className="flex-1">
                Shared
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="my-projects"
              className="flex-1 overflow-y-auto py-2 outline-none"
            >
              {ownedProjects.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <p className="text-sm text-text-muted">No projects yet.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  {ownedProjects.map((project) => (
                    <div
                      key={project.id}
                      className="group flex items-center justify-between rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-bg-subtle"
                    >
                      <div className="flex min-w-0 flex-1 flex-col pr-2">
                        <span className="truncate text-xs font-medium text-text-primary">
                          {project.name}
                        </span>
                        <span className="truncate font-mono text-[11px] text-text-faint">
                          /{project.slug}
                        </span>
                      </div>

                      {/* Actions shown only for owned projects */}
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => openRenameDialog(project)}
                          aria-label={`Rename ${project.name}`}
                          title="Rename"
                        >
                          <Pencil className="h-3.5 w-3.5 text-text-muted hover:text-text-primary" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => openDeleteDialog(project)}
                          aria-label={`Delete ${project.name}`}
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-state-error/70 hover:text-state-error" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent
              value="shared"
              className="flex-1 overflow-y-auto py-2 outline-none"
            >
              {sharedProjects.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <p className="text-sm text-text-muted">No shared projects.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  {sharedProjects.map((project) => (
                    <div
                      key={project.id}
                      className="flex items-center justify-between rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-bg-subtle"
                    >
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-xs font-medium text-text-primary">
                          {project.name}
                        </span>
                        <span className="truncate font-mono text-[11px] text-text-faint">
                          /{project.slug}
                        </span>
                      </div>
                      {/* Actions are hidden for shared/collaborator projects */}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer — New Project button */}
        <div className="border-t border-border-default p-3">
          <Button
            variant="default"
            className="w-full gap-2"
            onClick={openCreateDialog}
          >
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </div>
      </aside>
    </>
  )
}
