"use client"

import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useProjectActions } from "@/hooks/use-project-actions"

export function EditorHomeContent() {
  const { openCreateDialog } = useProjectActions()

  return (
    <div className="flex h-[calc(100vh-3rem)] flex-col items-center justify-center px-4 text-center">
      <div className="flex max-w-md flex-col items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
          Create a project or open an existing one
        </h1>
        <p className="text-sm text-text-muted">
          Start a new architecture workspace, or choose a project from the sidebar.
        </p>
        <Button onClick={openCreateDialog} className="mt-2 gap-2">
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>
    </div>
  )
}
