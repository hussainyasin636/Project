"use client"

import { memo, useEffect, useRef, useState } from "react"
import {
  getSmoothStepPath,
  EdgeLabelRenderer,
  useReactFlow,
  type EdgeProps,
} from "@xyflow/react"
import { useMutation } from "@liveblocks/react/suspense"
import type { CanvasEdge } from "@/types/canvas"

/**
 * Custom edge renderer for canvas edges (canvasEdge).
 * Features:
 * - Clean right-angle routing using getSmoothStepPath with rounded corners
 * - Arrowhead at the end of each edge matching the stroke color
 * - Dimmed light stroke at rest, brightens on hover or selection
 * - Wide invisible interaction path for easy clicking/hovering without increasing visible line thickness
 * - Inline label editing on double click using EdgeLabelRenderer and path midpoint
 * - Auto-growing input with save on blur, Enter, or Escape
 * - Faint hint pill when an active edge has no label
 * - Liveblocks CRDT and React Flow synchronized data flow
 */
function CanvasEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  data,
}: EdgeProps<CanvasEdge>) {
  const { setEdges } = useReactFlow()
  const [isHovered, setIsHovered] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [draftLabel, setDraftLabel] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const edgeData =
    data && typeof (data as unknown as { toObject?: () => Record<string, unknown> }).toObject === "function"
      ? (data as unknown as { toObject: () => Record<string, unknown> }).toObject()
      : (data as Record<string, unknown>) || {}

  const label = typeof edgeData.label === "string" ? edgeData.label : ""

  // Calculate clean right-angle smooth step path and midpoint
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 8,
    offset: 20,
  })

  // Liveblocks mutation to synchronize edge label
  const updateEdgeLabel = useMutation(({ storage }, newLabel: string) => {
    const flow = storage.get("flow")
    if (!flow) return
    const edgesMap = flow.get("edges")
    if (!edgesMap) return
    const edge = edgesMap.get(id)
    if (!edge) return

    const currentData = (edge.get("data") as Record<string, unknown>) || {}
    const rawCurrentData =
      typeof (currentData as { toObject?: () => Record<string, unknown> }).toObject === "function"
        ? (currentData as { toObject: () => Record<string, unknown> }).toObject()
        : currentData

    edge.set("data", {
      ...rawCurrentData,
      label: newLabel,
    })
  }, [id])

  // Focus and select input on editing start
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleStartEditing = () => {
    setDraftLabel(label)
    setIsEditing(true)
  }

  const handleSave = () => {
    setIsEditing(false)
    const trimmed = draftLabel.trim()
    try {
      setEdges((edges) =>
        edges.map((e) =>
          e.id === id
            ? { ...e, data: { ...(e.data || {}), label: trimmed } }
            : e
        )
      )
    } catch {}

    try {
      updateEdgeLabel(trimmed)
    } catch {}
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation()
    if (e.key === "Enter" || e.key === "Escape") {
      e.preventDefault()
      handleSave()
    }
  }

  const strokeColor = selected
    ? "var(--accent-primary)" // vivid cyan when selected
    : isHovered
    ? "#f0f0f4" // bright white-tint when hovered
    : "rgba(240, 240, 244, 0.45)" // dimmed light stroke at rest

  const arrowMarkerId = `arrow-${id}`

  return (
    <>
      <defs>
        <marker
          id={arrowMarkerId}
          viewBox="0 0 10 10"
          refX="7"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path
            d="M 1 1.5 L 8.5 5 L 1 8.5 z"
            fill={strokeColor}
            className="transition-colors duration-150"
          />
        </marker>
      </defs>

      {/* Invisible wide interaction hitbox path for easy hovering and clicking */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        className="react-flow__edge-interaction cursor-pointer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onDoubleClick={(e) => {
          e.stopPropagation()
          handleStartEditing()
        }}
      />

      {/* Visible edge line with light stroke and rounded ends */}
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth={selected ? 2 : 1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        markerEnd={`url(#${arrowMarkerId})`}
        className="transition-colors duration-150 pointer-events-none"
      />

      {/* Inline Edge Label using EdgeLabelRenderer at path midpoint */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
          }}
          className="nodrag nopan"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {isEditing ? (
            <div className="relative flex items-center justify-center">
              {/* Invisible mirror span to auto-grow input with text */}
              <span className="invisible whitespace-pre px-2.5 py-0.5 text-xs font-medium">
                {draftLabel || "Label"}
              </span>
              <input
                ref={inputRef}
                type="text"
                value={draftLabel}
                onChange={(e) => setDraftLabel(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                className="nodrag nopan absolute inset-0 w-full rounded-full border border-accent-primary bg-bg-surface px-2.5 py-0.5 text-center text-xs font-medium text-text-primary shadow-lg outline-none focus:ring-1 focus:ring-accent-primary select-text"
                placeholder="Label"
              />
            </div>
          ) : label ? (
            /* Saved label rendered as small pill badge */
            <div
              onDoubleClick={(e) => {
                e.stopPropagation()
                handleStartEditing()
              }}
              title="Double-click to edit label"
              className={`nodrag nopan flex items-center justify-center rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-wide shadow-md backdrop-blur-md transition-all cursor-pointer select-none ${
                selected
                  ? "border-accent-primary bg-bg-surface text-accent-primary ring-1 ring-accent-primary/40 shadow-accent-primary/10"
                  : isHovered
                  ? "border-border-subtle bg-bg-surface text-text-primary"
                  : "border-border-default bg-bg-surface/90 text-text-secondary"
              }`}
            >
              <span className="max-w-[160px] truncate">{label}</span>
            </div>
          ) : selected || isHovered ? (
            /* Faint hint when active edge has no label */
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleStartEditing()
              }}
              onDoubleClick={(e) => {
                e.stopPropagation()
                handleStartEditing()
              }}
              className="nodrag nopan flex items-center justify-center rounded-full border border-border-default/60 bg-bg-surface/80 px-2 py-0.5 text-[11px] font-medium text-text-muted/60 shadow-sm backdrop-blur-sm transition-all hover:border-accent-primary hover:text-accent-primary cursor-pointer select-none"
            >
              + Add label
            </button>
          ) : null}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

export const CanvasEdgeRenderer = memo(CanvasEdgeComponent)
