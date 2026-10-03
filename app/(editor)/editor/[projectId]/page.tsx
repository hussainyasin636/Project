import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { getProjectWithAccess } from "@/lib/projects"
import { ProjectWorkspaceView } from "@/components/editor/project-workspace-view"

interface ProjectPageProps {
  params: Promise<{ projectId: string }>
}

export async function generateMetadata({
  params,
}: ProjectPageProps): Promise<Metadata> {
  const { projectId } = await params
  const { project } = await getProjectWithAccess(projectId)

  if (!project) {
    return {
      title: "Project Not Found | Ghost AI",
    }
  }

  return {
    title: `${project.name} | Ghost AI`,
    description:
      project.description || `Collaborative architecture workspace for ${project.name}`,
  }
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params
  const { project, isOwner, isCollaborator } = await getProjectWithAccess(projectId)

  if (!project) {
    notFound()
  }

  return (
    <ProjectWorkspaceView
      project={project}
      isOwner={isOwner}
      isCollaborator={isCollaborator}
    />
  )
}
