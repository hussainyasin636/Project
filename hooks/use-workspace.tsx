"use client"

import React, { createContext, useContext, useState, useCallback, useRef, useMemo } from "react"
import type { Project } from "@/types/project"

export interface PresenceCollaborator {
  connectionId: number
  id: string
  info?: {
    name?: string
    displayName?: string
    avatar?: string
    avatarUrl?: string
    color?: string
    cursorColor?: string
  }
}

export type SaveStatus = "idle" | "saving" | "saved" | "error"

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
  collaborators: PresenceCollaborator[]
  setCollaborators: (collaborators: PresenceCollaborator[]) => void
  saveStatus: SaveStatus
  setSaveStatus: (status: SaveStatus) => void
  setOnSave: (handler: (() => Promise<void>) | undefined) => void
  triggerSave: () => Promise<void>
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null)

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [activeProject, setActiveProject] = useState<Project | null>(null)
  // Default to true so the right AI sidebar placeholder is visible in the workspace shell out of the box
  const [isAiSidebarOpen, setIsAiSidebarOpen] = useState(true)
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false)
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false)
  const [collaborators, setCollaborators] = useState<PresenceCollaborator[]>([])
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle")
  const onSaveHandlerRef = useRef<(() => Promise<void>) | undefined>(undefined)

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

  const setOnSave = useCallback((handler: (() => Promise<void>) | undefined) => {
    onSaveHandlerRef.current = handler
  }, [])

  const triggerSave = useCallback(async () => {
    if (onSaveHandlerRef.current) {
      await onSaveHandlerRef.current()
    }
  }, [])

  const contextValue = useMemo(
    () => ({
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
      collaborators,
      setCollaborators,
      saveStatus,
      setSaveStatus,
      setOnSave,
      triggerSave,
    }),
    [
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
      collaborators,
      setCollaborators,
      saveStatus,
      setSaveStatus,
      setOnSave,
      triggerSave,
    ]
  )

  return (
    <WorkspaceContext.Provider value={contextValue}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace(): WorkspaceContextType | null {
  return useContext(WorkspaceContext)
}
