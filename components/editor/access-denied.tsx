import Link from "next/link"
import { Lock, ArrowLeft } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function AccessDenied() {
  return (
    <div className="flex h-[calc(100vh-3rem)] w-full flex-col items-center justify-center px-4 text-center bg-bg-base">
      <div className="flex max-w-sm flex-col items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border-default bg-bg-surface text-text-muted shadow-sm">
          <Lock className="h-6 w-6" />
        </div>

        <div className="flex flex-col gap-1.5">
          <h1 className="text-xl font-semibold text-text-primary">
            Access Denied
          </h1>
          <p className="text-sm text-text-muted">
            You don&apos;t have access to this project, or it may not exist.
          </p>
        </div>

        <Link
          href="/editor"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "mt-2 gap-2 border-border-default bg-bg-surface text-text-primary hover:bg-bg-subtle"
          )}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Projects
        </Link>
      </div>
    </div>
  )
}
