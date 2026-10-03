"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useProjectActions } from "@/hooks/use-project-actions"

export function ProjectDialogs() {
  const {
    dialogType,
    targetProject,
    createName,
    roomId,
    renameName,
    isLoading,
    error,
    closeDialog,
    setCreateName,
    setRenameName,
    handleCreateProject,
    handleRenameProject,
    handleDeleteProject,
  } = useProjectActions()

  return (
    <>
      {/* Create Project Dialog */}
      <Dialog
        open={dialogType === "create"}
        onOpenChange={(open) => {
          if (!open) closeDialog()
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Project</DialogTitle>
            <DialogDescription>
              Start a new architecture workspace. Choose a name to get started.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateProject} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="create-project-name"
                className="text-xs font-medium text-text-secondary"
              >
                Project Name
              </label>
              <Input
                id="create-project-name"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="e.g. Real-Time Chat Engine"
                autoFocus
              />

              <div className="flex flex-col gap-1 pt-0.5">
                <p className="text-xs text-text-muted">
                  Room ID preview:{" "}
                  <span className="font-mono text-accent-primary">
                    {roomId}
                  </span>
                </p>

                {error && (
                  <p className="text-xs text-state-error" role="alert">
                    {error}
                  </p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeDialog}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? "Creating..." : "Create Project"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Rename Project Dialog */}
      <Dialog
        open={dialogType === "rename"}
        onOpenChange={(open) => {
          if (!open) closeDialog()
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename Project</DialogTitle>
            <DialogDescription>
              Enter a new name for &quot;{targetProject?.name}&quot;.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRenameProject} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="rename-project-name"
                className="text-xs font-medium text-text-secondary"
              >
                Project Name
              </label>
              <Input
                id="rename-project-name"
                value={renameName}
                onChange={(e) => setRenameName(e.target.value)}
                placeholder="Project name"
                autoFocus
              />

              {error && (
                <p className="text-xs text-state-error" role="alert">
                  {error}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeDialog}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!renameName.trim() || isLoading}
              >
                {isLoading ? "Saving..." : "Rename"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Project Dialog */}
      <Dialog
        open={dialogType === "delete"}
        onOpenChange={(open) => {
          if (!open) closeDialog()
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{targetProject?.name}&quot;?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <p className="text-xs text-state-error px-1" role="alert">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={closeDialog}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteProject}
              disabled={isLoading}
            >
              {isLoading ? "Deleting..." : "Delete Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
