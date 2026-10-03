export interface ProjectCollaborator {
  id: string
  projectId: string
  email: string
  createdAt: string | Date
}

export interface Project {
  id: string
  ownerId: string
  name: string
  description?: string | null
  status: "DRAFT" | "ARCHIVED"
  canvasJsonPath?: string | null
  createdAt: string | Date
  updatedAt: string | Date
  collaborators?: ProjectCollaborator[]
}
