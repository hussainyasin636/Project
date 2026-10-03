"use client"

import { memo } from "react"
import { Handle, Position, type NodeProps } from "@xyflow/react"
import type { CanvasNode } from "@/types/canvas"
import { DEFAULT_NODE_COLOR, DEFAULT_NODE_TEXT_COLOR } from "@/types/canvas"

/**
 * Basic renderer for custom canvas nodes (canvasNode).
 * Renders every shape as a simple bordered rectangle with centered label and handles on four sides.
 */
function CanvasNodeComponent({ data, selected }: NodeProps<CanvasNode>) {
  const label = data.label
  const bgColor = data.color || DEFAULT_NODE_COLOR
  const textColor = DEFAULT_NODE_TEXT_COLOR

  return (
    <div
      style={{
        backgroundColor: bgColor,
        color: textColor,
      }}
      className={`group relative flex min-h-[60px] min-w-[140px] items-center justify-center rounded-xl border px-4 py-3 shadow-lg transition-all ${
        selected
          ? "border-accent-primary ring-2 ring-accent-primary/40"
          : "border-border-default hover:border-border-subtle"
      }`}
    >
      {/* 4 connection handles on each side */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="!h-2.5 !w-2.5 !border-2 !border-bg-base !bg-white opacity-0 transition-opacity hover:opacity-100 group-hover:opacity-100"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!h-2.5 !w-2.5 !border-2 !border-bg-base !bg-white opacity-0 transition-opacity hover:opacity-100 group-hover:opacity-100"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!h-2.5 !w-2.5 !border-2 !border-bg-base !bg-white opacity-0 transition-opacity hover:opacity-100 group-hover:opacity-100"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="!h-2.5 !w-2.5 !border-2 !border-bg-base !bg-white opacity-0 transition-opacity hover:opacity-100 group-hover:opacity-100"
      />

      <span className="select-none text-center text-xs font-medium tracking-wide">
        {label || <span className="italic text-text-muted">Empty node</span>}
      </span>
    </div>
  )
}

export const CanvasNodeRenderer = memo(CanvasNodeComponent)
