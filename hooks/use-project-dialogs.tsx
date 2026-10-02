"use client"

import React, { createContext, useContext, useState, useCallback } from "react"
import { INITIAL_MOCK_PROJECTS, type Project } from "@/types/project"

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export type DialogType = "create" | "rename" | "delete" | null

export interface ProjectDialogState {
  type: DialogType
  project: Project | null
}

export interface ProjectFormState {
  name: string
  slug: string
}

export interface ProjectDialogsContextType {
  dialogState: ProjectDialogState
  formState: ProjectFormState
  isLoading: boolean
  projects: Project[]
  openCreateDialog: () => void
  openRenameDialog: (project: Project) => void
  openDeleteDialog: (project: Project) => void
  closeDialog: () => void
  setFormName: (name: string) => void
  handleCreateProject: (e?: React.FormEvent) => void
  handleRenameProject: (e?: React.FormEvent) => void
  handleDeleteProject: () => void
}

const ProjectDialogsContext = createContext<ProjectDialogsContextType | null>(null)

export function useProjectDialogsState(initialProjects: Project[] = INITIAL_MOCK_PROJECTS) {
  const [projects, setProjects] = useState<Project[]>(initialProjects)
  const [dialogState, setDialogState] = useState<ProjectDialogState>({
    type: null,
    project: null,
  })
  const [formState, setFormState] = useState<ProjectFormState>({
    name: "",
    slug: "",
  })
  const [isLoading, setIsLoading] = useState(false)

  const openCreateDialog = useCallback(() => {
    setFormState({ name: "", slug: "" })
    setDialogState({ type: "create", project: null })
  }, [])

  const openRenameDialog = useCallback((project: Project) => {
    setFormState({ name: project.name, slug: project.slug })
    setDialogState({ type: "rename", project })
  }, [])

  const openDeleteDialog = useCallback((project: Project) => {
    setDialogState({ type: "delete", project })
  }, [])

  const closeDialog = useCallback(() => {
    setDialogState({ type: null, project: null })
    setFormState({ name: "", slug: "" })
    setIsLoading(false)
  }, [])

  const setFormName = useCallback((name: string) => {
    setFormState({
      name,
      slug: generateSlug(name),
    })
  }, [])

  const handleCreateProject = useCallback(
    (e?: React.FormEvent) => {
      if (e) {
        e.preventDefault()
      }
      const trimmedName = formState.name.trim()
      if (!trimmedName) return

      setIsLoading(true)
      const generated = generateSlug(trimmedName) || "project"
      const newProject: Project = {
        id: `proj-${Date.now()}`,
        name: trimmedName,
        slug: formState.slug || generated,
        isOwner: true,
        updatedAt: "Just now",
      }

      setProjects((prev) => [newProject, ...prev])
      setIsLoading(false)
      closeDialog()
    },
    [formState.name, formState.slug, closeDialog]
  )

  const handleRenameProject = useCallback(
    (e?: React.FormEvent) => {
      if (e) {
        e.preventDefault()
      }
      if (!dialogState.project) return
      const trimmedName = formState.name.trim()
      if (!trimmedName) return

      setIsLoading(true)
      const targetId = dialogState.project.id
      const newSlug = generateSlug(trimmedName) || "project"

      setProjects((prev) =>
        prev.map((p) =>
          p.id === targetId
            ? { ...p, name: trimmedName, slug: newSlug, updatedAt: "Just now" }
            : p
        )
      )
      setIsLoading(false)
      closeDialog()
    },
    [dialogState.project, formState.name, closeDialog]
  )

  const handleDeleteProject = useCallback(() => {
    if (!dialogState.project) return

    setIsLoading(true)
    const targetId = dialogState.project.id
    setProjects((prev) => prev.filter((p) => p.id !== targetId))
    setIsLoading(false)
    closeDialog()
  }, [dialogState.project, closeDialog])

  return {
    dialogState,
    formState,
    isLoading,
    projects,
    openCreateDialog,
    openRenameDialog,
    openDeleteDialog,
    closeDialog,
    setFormName,
    handleCreateProject,
    handleRenameProject,
    handleDeleteProject,
  }
}

export function ProjectDialogsProvider({ children }: { children: React.ReactNode }) {
  const value = useProjectDialogsState()

  return (
    <ProjectDialogsContext.Provider value={value}>
      {children}
    </ProjectDialogsContext.Provider>
  )
}

export function useProjectDialogs(): ProjectDialogsContextType {
  const context = useContext(ProjectDialogsContext)
  if (!context) {
    throw new Error("useProjectDialogs must be used within a ProjectDialogsProvider")
  }
  return context
}
