"use client"

import { useState } from "react"
import { EditorNavbar } from "@/components/editor/editor-navbar"
import { ProjectSidebar } from "@/components/editor/project-sidebar"
import { ProjectDialogs } from "@/components/editor/project-dialogs"
import { ProjectActionsProvider } from "@/hooks/use-project-actions"
import type { Project } from "@/types/project"

interface EditorShellProps {
  children: React.ReactNode
  ownedProjects?: Project[]
  sharedProjects?: Project[]
}

export function EditorShell({
  children,
  ownedProjects = [],
  sharedProjects = [],
}: EditorShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <ProjectActionsProvider>
      <EditorNavbar
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
      />
      <ProjectSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        ownedProjects={ownedProjects}
        sharedProjects={sharedProjects}
      />
      {/* Offset for the fixed navbar */}
      <main className="pt-12">{children}</main>
      <ProjectDialogs />
    </ProjectActionsProvider>
  )
}
