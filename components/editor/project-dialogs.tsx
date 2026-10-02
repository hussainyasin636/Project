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
import { useProjectDialogs } from "@/hooks/use-project-dialogs"
import { cn } from "@/lib/utils"

export function ProjectDialogs() {
  const {
    dialogState,
    formState,
    slugValidation,
    isLoading,
    closeDialog,
    setFormName,
    handleCreateProject,
    handleRenameProject,
    handleDeleteProject,
  } = useProjectDialogs()

  return (
    <>
      {/* Create Project Dialog */}
      <Dialog
        open={dialogState.type === "create"}
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
                value={formState.name}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Real-Time Chat Engine"
                aria-invalid={Boolean(slugValidation.error)}
                autoFocus
              />

              <div className="flex flex-col gap-1 pt-0.5">
                <p className="text-xs text-text-muted">
                  Slug preview:{" "}
                  <span
                    className={cn(
                      "font-mono",
                      slugValidation.error
                        ? "text-state-error"
                        : "text-accent-primary"
                    )}
                  >
                    {formState.slug || "project-slug"}
                  </span>
                </p>

                {slugValidation.error && (
                  <p className="text-xs text-state-error" role="alert">
                    {slugValidation.error}
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
                disabled={!slugValidation.isValid || isLoading}
              >
                {isLoading ? "Creating..." : "Create Project"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Rename Project Dialog */}
      <Dialog
        open={dialogState.type === "rename"}
        onOpenChange={(open) => {
          if (!open) closeDialog()
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename Project</DialogTitle>
            <DialogDescription>
              Enter a new name for &quot;{dialogState.project?.name}&quot;.
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
                value={formState.name}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Project name"
                aria-invalid={Boolean(slugValidation.error)}
                autoFocus
              />

              <div className="flex flex-col gap-1 pt-0.5">
                <p className="text-xs text-text-muted">
                  Slug preview:{" "}
                  <span
                    className={cn(
                      "font-mono",
                      slugValidation.error
                        ? "text-state-error"
                        : "text-accent-primary"
                    )}
                  >
                    {formState.slug || "project-slug"}
                  </span>
                </p>

                {slugValidation.error && (
                  <p className="text-xs text-state-error" role="alert">
                    {slugValidation.error}
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
                disabled={!slugValidation.isValid || isLoading}
              >
                {isLoading ? "Saving..." : "Rename"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Project Dialog */}
      <Dialog
        open={dialogState.type === "delete"}
        onOpenChange={(open) => {
          if (!open) closeDialog()
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{dialogState.project?.name}&quot;?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

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
