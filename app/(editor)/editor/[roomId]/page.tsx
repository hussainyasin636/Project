import { redirect } from "next/navigation"
import type { Metadata } from "next"
import { getCurrentUserIdentity, getProjectAccess } from "@/lib/project-access"
import { AccessDenied } from "@/components/editor/access-denied"
import { WorkspaceShell } from "@/components/editor/workspace-shell"

interface WorkspacePageProps {
  params: Promise<{ roomId: string }>
}

export async function generateMetadata({
  params,
}: WorkspacePageProps): Promise<Metadata> {
  const { roomId } = await params
  const { project, hasAccess } = await getProjectAccess(roomId)

  if (!hasAccess || !project) {
    return {
      title: "Access Denied | Ghost AI",
    }
  }

  return {
    title: `${project.name} | Ghost AI`,
    description:
      project.description ||
      `Collaborative architecture workspace for ${project.name}`,
  }
}

export default async function WorkspacePage({ params }: WorkspacePageProps) {
  const { roomId } = await params
  const identity = await getCurrentUserIdentity()

  // 1. Unauthenticated users redirect to /sign-in
  if (!identity?.userId) {
    redirect("/sign-in")
  }

  // 2. Check project access by owner or collaborator
  const { hasAccess, project, isOwner, isCollaborator } = await getProjectAccess(
    roomId,
    identity
  )

  // 3. Non-existent projects or users without access see AccessDenied
  if (!hasAccess || !project) {
    return <AccessDenied />
  }

  // 4. Render workspace shell with current project context
  return (
    <WorkspaceShell
      project={project}
      isOwner={isOwner}
      isCollaborator={isCollaborator}
    />
  )
}
