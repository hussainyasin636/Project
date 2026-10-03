"use client"

import { useState } from "react"
import { EditorNavbar } from "@/components/editor/editor-navbar"
import { ProjectSidebar } from "@/components/editor/project-sidebar"
import { ProjectDialogs } from "@/components/editor/project-dialogs"
import { ProjectActionsProvider } from "@/hooks/use-project-actions"
import { WorkspaceProvider } from "@/hooks/use-workspace"
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
      <WorkspaceProvider>
        <EditorNavbar
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          ownedProjects={ownedProjects}
          sharedProjects={sharedProjects}
        />
        <ProjectSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          ownedProjects={ownedProjects}
          sharedProjects={sharedProjects}
        />
        {/* Offset for the fixed navbar */}
        <div className="pt-12 h-screen w-full overflow-hidden bg-bg-base">{children}</div>
        <ProjectDialogs />
      </WorkspaceProvider>
    </ProjectActionsProvider>
  )
}
