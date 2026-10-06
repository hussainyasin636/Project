"use client"

import { useCallback } from "react"
import { useReactFlow } from "@xyflow/react"
import { useUndo, useRedo, useCanUndo, useCanRedo } from "@liveblocks/react"
import { ZoomIn, ZoomOut, Maximize, Undo2, Redo2 } from "lucide-react"
import { cn } from "@/lib/utils"

export interface CanvasControlBarProps {
  onZoomIn?: () => void
  onZoomOut?: () => void
  onFitView?: () => void
  onUndo?: () => void
  onRedo?: () => void
  canUndo?: boolean
  canRedo?: boolean
  className?: string
}

/**
 * Floating pill-shaped control bar positioned at the bottom-left of the canvas.
 * Contains:
 * - Zoom controls: zoom out, fit view, zoom in (with smooth 300ms animation)
 * - Thin divider
 * - History controls: undo, redo (wired to Liveblocks history, dimmed when disabled)
 */
export function CanvasControlBar({
  onZoomIn,
  onZoomOut,
  onFitView,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  className,
}: CanvasControlBarProps) {
  const reactFlow = useReactFlow()
  const liveblocksUndo = useUndo()
  const liveblocksRedo = useRedo()
  const liveblocksCanUndo = useCanUndo()
  const liveblocksCanRedo = useCanRedo()

  const handleZoomOut = useCallback(() => {
    if (onZoomOut) {
      onZoomOut()
    } else {
      reactFlow.zoomOut({ duration: 300 })
    }
  }, [onZoomOut, reactFlow])

  const handleFitView = useCallback(() => {
    if (onFitView) {
      onFitView()
    } else {
      reactFlow.fitView({ duration: 300 })
    }
  }, [onFitView, reactFlow])

  const handleZoomIn = useCallback(() => {
    if (onZoomIn) {
      onZoomIn()
    } else {
      reactFlow.zoomIn({ duration: 300 })
    }
  }, [onZoomIn, reactFlow])

  const handleUndo = useCallback(() => {
    if (onUndo) {
      onUndo()
    } else {
      liveblocksUndo()
    }
  }, [onUndo, liveblocksUndo])

  const handleRedo = useCallback(() => {
    if (onRedo) {
      onRedo()
    } else {
      liveblocksRedo()
    }
  }, [onRedo, liveblocksRedo])

  const isUndoEnabled = canUndo !== undefined ? canUndo : liveblocksCanUndo
  const isRedoEnabled = canRedo !== undefined ? canRedo : liveblocksCanRedo

  return (
    <div
      role="toolbar"
      aria-label="Canvas zoom and history controls"
      className={cn(
        "absolute bottom-6 left-6 z-25 flex items-center gap-1 rounded-full border border-border-default bg-bg-surface/90 px-2.5 py-1.5 shadow-2xl backdrop-blur-md select-none",
        className
      )}
    >
      {/* Zoom Controls: zoom out, fit view, zoom in */}
      <button
        type="button"
        onClick={handleZoomOut}
        title="Zoom out (-)"
        aria-label="Zoom out"
        className="flex h-8 w-8 items-center justify-center rounded-full text-text-secondary hover:bg-bg-elevated hover:text-text-primary active:scale-95 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-primary"
      >
        <ZoomOut className="h-4 w-4 pointer-events-none" />
      </button>

      <button
        type="button"
        onClick={handleFitView}
        title="Fit view"
        aria-label="Fit view"
        className="flex h-8 w-8 items-center justify-center rounded-full text-text-secondary hover:bg-bg-elevated hover:text-text-primary active:scale-95 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-primary"
      >
        <Maximize className="h-4 w-4 pointer-events-none" />
      </button>

      <button
        type="button"
        onClick={handleZoomIn}
        title="Zoom in (+ or =)"
        aria-label="Zoom in"
        className="flex h-8 w-8 items-center justify-center rounded-full text-text-secondary hover:bg-bg-elevated hover:text-text-primary active:scale-95 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-primary"
      >
        <ZoomIn className="h-4 w-4 pointer-events-none" />
      </button>

      {/* Thin divider */}
      <div
        className="mx-1 h-4 w-px bg-border-default select-none pointer-events-none"
        aria-hidden="true"
      />

      {/* History Controls: undo, redo */}
      <button
        type="button"
        onClick={handleUndo}
        disabled={!isUndoEnabled}
        title="Undo (Ctrl+Z)"
        aria-label="Undo"
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-primary",
          isUndoEnabled
            ? "text-text-secondary hover:bg-bg-elevated hover:text-text-primary active:scale-95 cursor-pointer"
            : "opacity-30 cursor-not-allowed text-text-muted hover:bg-transparent"
        )}
      >
        <Undo2 className="h-4 w-4 pointer-events-none" />
      </button>

      <button
        type="button"
        onClick={handleRedo}
        disabled={!isRedoEnabled}
        title="Redo (Ctrl+Shift+Z or Ctrl+Y)"
        aria-label="Redo"
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-primary",
          isRedoEnabled
            ? "text-text-secondary hover:bg-bg-elevated hover:text-text-primary active:scale-95 cursor-pointer"
            : "opacity-30 cursor-not-allowed text-text-muted hover:bg-transparent"
        )}
      >
        <Redo2 className="h-4 w-4 pointer-events-none" />
      </button>
    </div>
  )
}
