import { getUserProjects } from "@/lib/projects"
import { EditorHomeContent } from "@/components/editor/editor-home-content"

export default async function EditorPage() {
  // Prime server-side project cache for the request
  await getUserProjects()

  return <EditorHomeContent />
}
