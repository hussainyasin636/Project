"use client"

import { AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface CanvasErrorProps {
  error?: unknown
  resetErrorBoundary?: () => void
}

export function CanvasError({ error, resetErrorBoundary }: CanvasErrorProps) {
  const errorMessage =
    error instanceof Error
      ? error.message
      : typeof error === "string"
      ? error
      : "Unable to connect to the collaborative Liveblocks room. Please check your network and try again."

  return (
    <div className="flex h-full w-full flex-1 flex-col items-center justify-center p-6 bg-bg-base select-none">
      <div className="flex max-w-md flex-col items-center gap-4 rounded-2xl border border-border-default bg-bg-surface p-8 text-center shadow-xl">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-state-error/20 bg-state-error/10 text-state-error">
          <AlertTriangle className="h-6 w-6" />
        </div>

        <div className="flex flex-col gap-1.5">
          <h3 className="text-base font-semibold text-text-primary">
            Canvas Connection Error
          </h3>
          <p className="text-xs text-text-muted leading-relaxed">
            {errorMessage}
          </p>
        </div>

        {resetErrorBoundary && (
          <Button
            variant="outline"
            size="sm"
            onClick={resetErrorBoundary}
            className="mt-2 inline-flex items-center gap-2 border-border-default bg-bg-elevated hover:bg-bg-subtle text-text-primary"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Retry Connection</span>
          </Button>
        )}
      </div>
    </div>
  )
}
