"use client"

import React, { createContext, useContext, useState, useCallback } from "react"
import type { Project } from "@/types/project"

export interface WorkspaceContextType {
  activeProject: Project | null
  setActiveProject: (project: Project | null) => void
  isAiSidebarOpen: boolean
  setIsAiSidebarOpen: (open: boolean | ((prev: boolean) => boolean)) => void
  toggleAiSidebar: () => void
  isShareDialogOpen: boolean
  setIsShareDialogOpen: (open: boolean) => void
  openShareDialog: () => void
  closeShareDialog: () => void
  isTemplatesModalOpen: boolean
  setIsTemplatesModalOpen: (open: boolean) => void
  openTemplatesModal: () => void
  closeTemplatesModal: () => void
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null)

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [activeProject, setActiveProject] = useState<Project | null>(null)
  // Default to true so the right AI sidebar placeholder is visible in the workspace shell out of the box
  const [isAiSidebarOpen, setIsAiSidebarOpen] = useState(true)
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false)
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false)

  const toggleAiSidebar = useCallback(() => {
    setIsAiSidebarOpen((prev) => !prev)
  }, [])

  const openShareDialog = useCallback(() => {
    setIsShareDialogOpen(true)
  }, [])

  const closeShareDialog = useCallback(() => {
    setIsShareDialogOpen(false)
  }, [])

  const openTemplatesModal = useCallback(() => {
    setIsTemplatesModalOpen(true)
  }, [])

  const closeTemplatesModal = useCallback(() => {
    setIsTemplatesModalOpen(false)
  }, [])

  return (
    <WorkspaceContext.Provider
      value={{
        activeProject,
        setActiveProject,
        isAiSidebarOpen,
        setIsAiSidebarOpen,
        toggleAiSidebar,
        isShareDialogOpen,
        setIsShareDialogOpen,
        openShareDialog,
        closeShareDialog,
        isTemplatesModalOpen,
        setIsTemplatesModalOpen,
        openTemplatesModal,
        closeTemplatesModal,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace(): WorkspaceContextType | null {
  return useContext(WorkspaceContext)
}
