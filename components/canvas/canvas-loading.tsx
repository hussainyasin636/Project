"use client"

import { Loader2 } from "lucide-react"

export function CanvasLoading() {
  return (
    <div className="flex h-full w-full flex-1 flex-col items-center justify-center p-6 bg-bg-base select-none">
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-border-default bg-bg-surface/80 px-6 py-5 text-center shadow-lg backdrop-blur-sm">
        <Loader2 className="h-6 w-6 animate-spin text-accent-primary" />
        <span className="text-xs font-medium text-text-secondary">
          Connecting to collaborative canvas...
        </span>
      </div>
    </div>
  )
}
