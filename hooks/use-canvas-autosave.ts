"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import type { CanvasNode, CanvasEdge } from "@/types/canvas"

export type SaveStatus = "idle" | "saving" | "saved" | "error"

export interface UseCanvasAutosaveOptions {
  projectId?: string | null
  nodes: CanvasNode[]
  edges: CanvasEdge[]
  debounceMs?: number
  enabled?: boolean
  onStatusChange?: (status: SaveStatus) => void
}

export interface UseCanvasAutosaveReturn {
  saveStatus: SaveStatus
  saveNow: () => Promise<void>
  lastSavedAt: Date | null
  markAsSaved: (nodes: CanvasNode[], edges: CanvasEdge[]) => void
}

/**
 * Strips transient React Flow properties (like selection, active dragging)
 * to ensure autosave only triggers on structural or visual content changes.
 */
function serializeCanvasSnapshot(nodes: CanvasNode[], edges: CanvasEdge[]): string {
  const normalizedNodes = nodes.map((n) => ({
    id: n.id,
    type: n.type,
    position: {
      x: Math.round(n.position.x),
      y: Math.round(n.position.y),
    },
    data: {
      label: n.data?.label ?? "",
      color: n.data?.color,
      textColor: n.data?.textColor,
      shape: n.data?.shape,
    },
    width: n.width,
    height: n.height,
  }))

  const normalizedEdges = edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle,
    targetHandle: e.targetHandle,
    type: e.type,
    data: {
      label: e.data?.label ?? "",
    },
  }))

  return JSON.stringify({ nodes: normalizedNodes, edges: normalizedEdges })
}

/**
 * Custom hook that monitors canvas nodes and edges, debounces network writes,
 * saves canvas state to the backend API, and tracks save status.
 */
export function useCanvasAutosave({
  projectId,
  nodes,
  edges,
  debounceMs = 1500,
  enabled = true,
  onStatusChange,
}: UseCanvasAutosaveOptions): UseCanvasAutosaveReturn {
  const [saveStatus, setSaveStatusState] = useState<SaveStatus>("idle")
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)

  const isSavingRef = useRef(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const lastSavedSnapshotRef = useRef<string | null>(null)
  const hasInitializedRef = useRef(false)

  // Keep live references to current nodes and edges updated in effect
  const nodesRef = useRef(nodes)
  const edgesRef = useRef(edges)
  const executeSaveRef = useRef<(() => Promise<void>) | null>(null)

  useEffect(() => {
    nodesRef.current = nodes
    edgesRef.current = edges
  }, [nodes, edges])

  const setSaveStatus = useCallback(
    (status: SaveStatus) => {
      setSaveStatusState(status)
      if (onStatusChange) {
        onStatusChange(status)
      }
    },
    [onStatusChange]
  )

  /**
   * Explicitly marks a specific node/edge combination as saved,
   * used when loading saved state from the server or template.
   */
  const markAsSaved = useCallback(
    (savedNodes: CanvasNode[], savedEdges: CanvasEdge[]) => {
      const snapshot = serializeCanvasSnapshot(savedNodes, savedEdges)
      lastSavedSnapshotRef.current = snapshot
      hasInitializedRef.current = true
      setSaveStatus("saved")
      setLastSavedAt(new Date())
    },
    [setSaveStatus]
  )

  /**
   * Core function to persist the current canvas nodes and edges to the API.
   */
  const executeSave = useCallback(async (): Promise<void> => {
    if (!projectId || isSavingRef.current) {
      return
    }

    const currentNodes = nodesRef.current
    const currentEdges = edgesRef.current
    const currentSnapshot = serializeCanvasSnapshot(currentNodes, currentEdges)

    // Nothing changed since last successful save
    if (currentSnapshot === lastSavedSnapshotRef.current) {
      return
    }

    isSavingRef.current = true
    setSaveStatus("saving")

    try {
      const res = await fetch(`/api/projects/${projectId}/canvas`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nodes: currentNodes,
          edges: currentEdges,
        }),
      })

      if (!res.ok) {
        throw new Error(`Failed to save canvas (status ${res.status})`)
      }

      lastSavedSnapshotRef.current = currentSnapshot
      setLastSavedAt(new Date())

      // Check if user continued editing (e.g. moved nodes) while this save was in flight
      const latestSnapshot = serializeCanvasSnapshot(nodesRef.current, edgesRef.current)
      if (latestSnapshot !== currentSnapshot) {
        // Edits occurred while saving! Queue a follow-up save
        if (timerRef.current) {
          clearTimeout(timerRef.current)
        }
        timerRef.current = setTimeout(() => {
          timerRef.current = null
          void executeSaveRef.current?.()
        }, debounceMs)
      } else {
        setSaveStatus("saved")
      }
    } catch (err) {
      console.error("[Autosave] Error saving canvas:", err)
      setSaveStatus("error")
    } finally {
      isSavingRef.current = false
    }
  }, [projectId, setSaveStatus, debounceMs])

  useEffect(() => {
    executeSaveRef.current = executeSave
  }, [executeSave])

  /**
   * Manual save trigger (e.g. from editor navbar Save button).
   */
  const saveNow = useCallback(async (): Promise<void> => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    await executeSave()
  }, [executeSave])

  // Monitor changes to nodes and edges and schedule debounced save
  useEffect(() => {
    if (!enabled || !projectId) {
      return
    }

    const currentSnapshot = serializeCanvasSnapshot(nodes, edges)

    // On initial mount or before room data is checked, initialize snapshot without saving
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true
      lastSavedSnapshotRef.current = currentSnapshot
      return
    }

    // If identical to last saved snapshot, do nothing
    if (currentSnapshot === lastSavedSnapshotRef.current) {
      return
    }

    // Set status to indicate pending change
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    const scheduleSave = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }

      timerRef.current = setTimeout(() => {
        timerRef.current = null

        // If the user is currently typing in a textarea or input, wait until they finish
        const activeEl = typeof document !== "undefined" ? document.activeElement : null
        const isUserTyping =
          activeEl?.tagName === "TEXTAREA" ||
          activeEl?.tagName === "INPUT" ||
          activeEl?.getAttribute("contenteditable") === "true"

        if (isUserTyping) {
          // Re-schedule so we never interrupt active typing
          scheduleSave()
          return
        }

        void executeSave()
      }, debounceMs)
    }

    scheduleSave()

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [nodes, edges, projectId, enabled, debounceMs, executeSave])

  // When a text input or textarea blurs (e.g. user completes typing a node label),
  // execute pending save promptly
  useEffect(() => {
    const handleFocusOut = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null
      if (
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "INPUT" ||
        target?.getAttribute("contenteditable") === "true"
      ) {
        if (timerRef.current) {
          clearTimeout(timerRef.current)
          timerRef.current = setTimeout(() => {
            timerRef.current = null
            void executeSave()
          }, 600)
        }
      }
    }

    window.addEventListener("focusout", handleFocusOut)
    return () => {
      window.removeEventListener("focusout", handleFocusOut)
    }
  }, [executeSave])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  return {
    saveStatus,
    saveNow,
    lastSavedAt,
    markAsSaved,
  }
}
