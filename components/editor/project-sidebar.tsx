"use client"

import { X, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

interface ProjectSidebarProps {
  isOpen: boolean
  onClose: () => void
  className?: string
}

export function ProjectSidebar({ isOpen, onClose, className }: ProjectSidebarProps) {
  return (
    <>
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

            <TabsContent value="my-projects" className="flex-1 py-4">
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-text-muted">No projects yet.</p>
              </div>
            </TabsContent>

            <TabsContent value="shared" className="flex-1 py-4">
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-text-muted">No shared projects.</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer — New Project button */}
        <div className="border-t border-border-default p-3">
          <Button variant="default" className="w-full gap-2">
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </div>
      </aside>
    </>
  )
}
