"use client"

import React, { createContext, useContext, useState, useCallback, useMemo } from "react"
import { useRouter, usePathname } from "next/navigation"
import { generateSlug } from "@/lib/slug"

export type DialogType = "create" | "rename" | "delete" | null

export interface TargetProject {
  id: string
  name: string
}

export interface ProjectActionsContextType {
  dialogType: DialogType
  targetProject: TargetProject | null
  createName: string
  createSuffix: string
  roomId: string
  renameName: string
  isLoading: boolean
  error: string | null
  openCreateDialog: () => void
  openRenameDialog: (project: TargetProject) => void
  openDeleteDialog: (project: TargetProject) => void
  closeDialog: () => void
  setCreateName: (name: string) => void
  setRenameName: (name: string) => void
  handleCreateProject: (e?: React.FormEvent) => Promise<void>
  handleRenameProject: (e?: React.FormEvent) => Promise<void>
  handleDeleteProject: () => Promise<void>
}

const ProjectActionsContext = createContext<ProjectActionsContextType | null>(null)

function generateShortSuffix(): string {
  return Math.random().toString(36).substring(2, 7)
}

export function useProjectActionsState() {
  const router = useRouter()
  const pathname = usePathname()

  const [dialogType, setDialogType] = useState<DialogType>(null)
  const [targetProject, setTargetProject] = useState<TargetProject | null>(null)
  const [createName, setCreateName] = useState("")
  const [createSuffix, setCreateSuffix] = useState("")
  const [renameName, setRenameName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const roomId = useMemo(() => {
    const baseSlug = generateSlug(createName.trim()) || "untitled-project"
    return `${baseSlug}-${createSuffix || "workspace"}`
  }, [createName, createSuffix])

  const openCreateDialog = useCallback(() => {
    setCreateName("")
    setCreateSuffix(generateShortSuffix())
    setError(null)
    setDialogType("create")
  }, [])

  const openRenameDialog = useCallback((project: TargetProject) => {
    setTargetProject(project)
    setRenameName(project.name)
    setError(null)
    setDialogType("rename")
  }, [])

  const openDeleteDialog = useCallback((project: TargetProject) => {
    setTargetProject(project)
    setError(null)
    setDialogType("delete")
  }, [])

  const closeDialog = useCallback(() => {
    setDialogType(null)
    setTargetProject(null)
    setCreateName("")
    setRenameName("")
    setError(null)
    setIsLoading(false)
  }, [])

  const handleCreateProject = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault()
      setIsLoading(true)
      setError(null)

      try {
        const finalName = createName.trim() || "Untitled Project"
        const response = await fetch("/api/projects", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: roomId,
            name: finalName,
          }),
        })

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}))
          throw new Error(errData.error || "Failed to create project")
        }

        const project = await response.json()
        closeDialog()
        router.push(`/editor/${project.id}`)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "An error occurred"
        setError(message)
      } finally {
        setIsLoading(false)
      }
    },
    [createName, roomId, closeDialog, router]
  )

  const handleRenameProject = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault()
      if (!targetProject) return
      const trimmed = renameName.trim()
      if (!trimmed) {
        setError("Project name cannot be empty")
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/projects/${targetProject.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: trimmed,
          }),
        })

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}))
          throw new Error(errData.error || "Failed to rename project")
        }

        closeDialog()
        router.refresh()
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "An error occurred"
        setError(message)
      } finally {
        setIsLoading(false)
      }
    },
    [targetProject, renameName, closeDialog, router]
  )

  const handleDeleteProject = useCallback(async () => {
    if (!targetProject) return
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/projects/${targetProject.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error || "Failed to delete project")
      }

      const activeDeleted = pathname === `/editor/${targetProject.id}`
      closeDialog()

      if (activeDeleted) {
        router.push("/editor")
      } else {
        router.refresh()
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An error occurred"
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [targetProject, pathname, closeDialog, router])

  return {
    dialogType,
    targetProject,
    createName,
    createSuffix,
    roomId,
    renameName,
    isLoading,
    error,
    openCreateDialog,
    openRenameDialog,
    openDeleteDialog,
    closeDialog,
    setCreateName,
    setRenameName,
    handleCreateProject,
    handleRenameProject,
    handleDeleteProject,
  }
}

export function ProjectActionsProvider({ children }: { children: React.ReactNode }) {
  const value = useProjectActionsState()

  return (
    <ProjectActionsContext.Provider value={value}>
      {children}
    </ProjectActionsContext.Provider>
  )
}

export function useProjectActions(): ProjectActionsContextType {
  const context = useContext(ProjectActionsContext)
  if (!context) {
    throw new Error("useProjectActions must be used within a ProjectActionsProvider")
  }
  return context
}

// Backward compatibility alias
export const useProjectDialogs = useProjectActions
