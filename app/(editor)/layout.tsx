import { EditorShell } from "@/components/editor/editor-shell"
import { getUserProjects } from "@/lib/projects"

export default async function EditorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { ownedProjects, sharedProjects } = await getUserProjects()

  return (
    <EditorShell
      ownedProjects={ownedProjects}
      sharedProjects={sharedProjects}
    >
      {children}
    </EditorShell>
  )
}
