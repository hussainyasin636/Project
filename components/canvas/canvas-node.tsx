"use client"

import { memo, useEffect, useRef, useState } from "react"
import {
  Handle,
  Position,
  NodeResizer,
  NodeToolbar,
  useReactFlow,
  type NodeProps,
} from "@xyflow/react"
import { useMutation } from "@liveblocks/react/suspense"
import type { CanvasNode, NodeColorPair, NodeShape } from "@/types/canvas"
import {
  DEFAULT_NODE_COLOR,
  DEFAULT_NODE_TEXT_COLOR,
  NODE_COLORS,
  NODE_SHAPES,
  SHAPE_DEFAULT_SIZES,
} from "@/types/canvas"

interface ColorSwatchButtonProps {
  colorKey: string
  colorPair: NodeColorPair
  isActive: boolean
  onSelect: (pair: NodeColorPair) => void
}

/**
 * Interactive color swatch button for the floating color toolbar.
 * Features:
 * - Subtle, controlled glow based on its paired text color on hover
 * - Clearly distinguished active selection indicator
 * - Stops event propagation to prevent node dragging or canvas panning
 */
function ColorSwatchButton({
  colorKey,
  colorPair,
  isActive,
  onSelect,
}: ColorSwatchButtonProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <button
      type="button"
      key={colorKey}
      title={colorPair.name}
      aria-label={`Set color to ${colorPair.name}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(e) => {
        e.stopPropagation()
        onSelect(colorPair)
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        backgroundColor: colorPair.fill,
        boxShadow: isHovered
          ? `0 0 8px 1px ${colorPair.text}90`
          : isActive
          ? `0 0 6px 1px ${colorPair.text}50`
          : undefined,
      }}
      className={`nodrag nopan relative flex h-5 w-5 items-center justify-center rounded-full border transition-all cursor-pointer ${
        isActive
          ? "scale-110 border-white ring-2 ring-white/80 ring-offset-1 ring-offset-bg-surface"
          : "border-white/20 hover:scale-105 hover:border-white/50"
      }`}
    >
      {isActive && (
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: colorPair.text }}
        />
      )}
    </button>
  )
}

interface NodeLabelEditorProps {
  isEditing: boolean
  label: string
  draftLabel: string
  textColor: string
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  onBlur: () => void
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  onDoubleClick: (e: React.MouseEvent) => void
}

/**
 * Centered inline label editor that switches seamlessly between
 * view mode and a smooth, non-shifting textarea editor.
 */
function NodeLabelEditor({
  isEditing,
  label,
  draftLabel,
  textColor,
  textareaRef,
  onChange,
  onBlur,
  onKeyDown,
  onDoubleClick,
}: NodeLabelEditorProps) {
  if (isEditing) {
    return (
      <textarea
        ref={textareaRef}
        value={draftLabel}
        onChange={onChange}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
        rows={1}
        placeholder="Empty node"
        className="nodrag nopan w-full resize-none border-none bg-transparent p-0 m-0 text-center text-xs font-medium tracking-wide outline-none focus:outline-none focus:ring-0 placeholder:text-text-muted/50 overflow-hidden select-text"
        style={{
          color: textColor,
          caretColor: textColor,
        }}
      />
    )
  }

  return (
    <span
      onDoubleClick={onDoubleClick}
      className="max-w-full break-words text-center text-xs font-medium tracking-wide select-none cursor-text"
    >
      {label || <span className="italic text-text-muted/60">Empty node</span>}
    </span>
  )
}

/**
 * Custom node renderer for canvas nodes (canvasNode).
 * Features:
 * - Proper shape variants: CSS (rectangle, pill, circle) & SVG (diamond, hexagon, cylinder)
 * - Floating color toolbar above selected nodes with predefined color palette
 * - Resizing via NodeResizer when selected with dark canvas UI handles
 * - Inline label editing on double click with zero layout shift
 * - Liveblocks CRDT and React Flow synchronization
 * - Connection handles on 4 sides on hover
 */
function CanvasNodeComponent({
  id,
  data,
  selected,
  width,
  height,
}: NodeProps<CanvasNode>) {
  const { updateNodeData } = useReactFlow()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const nodeData =
    data && typeof (data as unknown as { toObject?: () => Record<string, unknown> }).toObject === "function"
      ? (data as unknown as { toObject: () => Record<string, unknown> }).toObject()
      : (data as Record<string, unknown>) || {}

  const rawShape = nodeData.shape as string | undefined
  const shape: NodeShape =
    rawShape && NODE_SHAPES.includes(rawShape as NodeShape)
      ? (rawShape as NodeShape)
      : "rectangle"

  const defaultSize = SHAPE_DEFAULT_SIZES[shape] || SHAPE_DEFAULT_SIZES.rectangle
  const w = width || defaultSize.width
  const h = height || defaultSize.height

  const label = typeof nodeData.label === "string" ? nodeData.label : ""
  const bgColor =
    typeof nodeData.color === "string" && nodeData.color
      ? nodeData.color
      : DEFAULT_NODE_COLOR

  // Match text color from palette or stored property
  const colorMatch = Object.values(NODE_COLORS).find(
    (c) => c.fill.toLowerCase() === bgColor.toLowerCase()
  )
  const textColor =
    typeof nodeData.textColor === "string" && nodeData.textColor
      ? nodeData.textColor
      : colorMatch
      ? colorMatch.text
      : DEFAULT_NODE_TEXT_COLOR

  // Inline editing state
  const [isEditing, setIsEditing] = useState(false)
  const [draftLabel, setDraftLabel] = useState("")

  // Liveblocks mutation to update node label in CRDT storage
  const updateNodeLabel = useMutation(({ storage }, newLabel: string) => {
    const flow = storage.get("flow")
    if (!flow) return
    const nodes = flow.get("nodes")
    if (!nodes) return
    const node = nodes.get(id)
    if (!node) return

    const currentData = (node.get("data") as Record<string, unknown>) || {}
    const rawCurrentData =
      typeof (currentData as { toObject?: () => Record<string, unknown> }).toObject === "function"
        ? (currentData as { toObject: () => Record<string, unknown> }).toObject()
        : currentData

    node.set("data", {
      ...rawCurrentData,
      label: newLabel,
    })
  }, [id])

  // Liveblocks mutation to update node color pair in CRDT storage
  const updateNodeColor = useMutation(
    ({ storage }, fill: string, text: string) => {
      const flow = storage.get("flow")
      if (!flow) return
      const nodes = flow.get("nodes")
      if (!nodes) return
      const node = nodes.get(id)
      if (!node) return

      const currentData = (node.get("data") as Record<string, unknown>) || {}
      const rawCurrentData =
        typeof (currentData as { toObject?: () => Record<string, unknown> }).toObject === "function"
          ? (currentData as { toObject: () => Record<string, unknown> }).toObject()
          : currentData

      node.set("data", {
        ...rawCurrentData,
        color: fill,
        textColor: text,
      })
    },
    [id]
  )

  const handleSelectColor = (colorPair: NodeColorPair) => {
    try {
      updateNodeData(id, {
        color: colorPair.fill,
        textColor: colorPair.text,
      })
    } catch {}

    try {
      updateNodeColor(colorPair.fill, colorPair.text)
    } catch {}
  }

  // Auto-focus and resize textarea on edit start
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.select()
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [isEditing])

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setDraftLabel(label)
    setIsEditing(true)
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextVal = e.target.value
    setDraftLabel(nextVal)

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }

    try {
      updateNodeData(id, { label: nextVal })
    } catch {}

    try {
      updateNodeLabel(nextVal)
    } catch {}
  }

  const handleBlur = () => {
    setIsEditing(false)
    try {
      updateNodeData(id, { label: draftLabel })
      updateNodeLabel(draftLabel)
    } catch {}
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    e.stopPropagation()
    if (e.key === "Escape") {
      e.preventDefault()
      setIsEditing(false)
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      setIsEditing(false)
    }
  }

  const strokeColor = selected ? "var(--accent-primary)" : "var(--border-default)"
  const strokeWidth = selected ? 2.5 : 1.5
  const inset = strokeWidth / 2

  return (
    <div
      style={{
        width: `${w}px`,
        height: `${h}px`,
        color: textColor,
      }}
      onDoubleClick={handleDoubleClick}
      className="group relative select-none"
    >
      {/* Floating color toolbar above selected node */}
      <NodeToolbar
        nodeId={id}
        isVisible={selected}
        position={Position.Top}
        offset={12}
        align="center"
        className="nodrag nopan"
      >
        <div
          role="toolbar"
          aria-label="Node color palette"
          className="flex items-center gap-1.5 rounded-full border border-border-default bg-bg-surface/95 px-2.5 py-1.5 shadow-2xl backdrop-blur-md"
        >
          {Object.entries(NODE_COLORS).map(([key, colorPair]) => (
            <ColorSwatchButton
              key={key}
              colorKey={key}
              colorPair={colorPair}
              isActive={colorPair.fill.toLowerCase() === bgColor.toLowerCase()}
              onSelect={handleSelectColor}
            />
          ))}
        </div>
      </NodeToolbar>

      {/* Node Resizer: appears when selected */}
      <NodeResizer
        nodeId={id}
        isVisible={selected}
        minWidth={shape === "circle" ? 60 : 70}
        minHeight={shape === "circle" ? 60 : 40}
        keepAspectRatio={shape === "circle"}
        color="#00c8d4"
        lineClassName="!border-accent-primary/60"
        handleClassName="!w-2 !h-2 !bg-bg-elevated !border !border-accent-primary !rounded-xs shadow-sm hover:!bg-accent-primary transition-colors"
      />

      {/* 4 connection handles on each side */}
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        isConnectableStart={true}
        isConnectableEnd={true}
        className="!h-2.5 !w-2.5 !border-2 !border-bg-base !bg-white opacity-0 transition-opacity hover:opacity-100 group-hover:opacity-100 z-10"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        isConnectableStart={true}
        isConnectableEnd={true}
        className="!h-2.5 !w-2.5 !border-2 !border-bg-base !bg-white opacity-0 transition-opacity hover:opacity-100 group-hover:opacity-100 z-10"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        isConnectableStart={true}
        isConnectableEnd={true}
        className="!h-2.5 !w-2.5 !border-2 !border-bg-base !bg-white opacity-0 transition-opacity hover:opacity-100 group-hover:opacity-100 z-10"
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        isConnectableStart={true}
        isConnectableEnd={true}
        className="!h-2.5 !w-2.5 !border-2 !border-bg-base !bg-white opacity-0 transition-opacity hover:opacity-100 group-hover:opacity-100 z-10"
      />

      {/* 1. CSS Shapes: rectangle */}
      {shape === "rectangle" && (
        <div
          style={{
            backgroundColor: bgColor,
            width: "100%",
            height: "100%",
          }}
          className={`flex items-center justify-center rounded-xl border px-3.5 py-2 transition-all ${
            selected
              ? "border-accent-primary ring-2 ring-accent-primary/40 shadow-lg shadow-accent-primary/10"
              : "border-border-default hover:border-border-subtle shadow-md"
          }`}
        >
          <div className="flex h-full w-full items-center justify-center">
            <NodeLabelEditor
              isEditing={isEditing}
              label={label}
              draftLabel={draftLabel}
              textColor={textColor}
              textareaRef={textareaRef}
              onChange={handleChange}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              onDoubleClick={handleDoubleClick}
            />
          </div>
        </div>
      )}

      {/* 2. CSS Shapes: pill */}
      {shape === "pill" && (
        <div
          style={{
            backgroundColor: bgColor,
            width: "100%",
            height: "100%",
          }}
          className={`flex items-center justify-center rounded-full border px-4 py-2 transition-all ${
            selected
              ? "border-accent-primary ring-2 ring-accent-primary/40 shadow-lg shadow-accent-primary/10"
              : "border-border-default hover:border-border-subtle shadow-md"
          }`}
        >
          <div className="flex h-full w-full max-w-[85%] items-center justify-center">
            <NodeLabelEditor
              isEditing={isEditing}
              label={label}
              draftLabel={draftLabel}
              textColor={textColor}
              textareaRef={textareaRef}
              onChange={handleChange}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              onDoubleClick={handleDoubleClick}
            />
          </div>
        </div>
      )}

      {/* 3. CSS Shapes: circle */}
      {shape === "circle" && (
        <div
          style={{
            backgroundColor: bgColor,
            width: "100%",
            height: "100%",
          }}
          className={`flex items-center justify-center rounded-full border p-2 transition-all ${
            selected
              ? "border-accent-primary ring-2 ring-accent-primary/40 shadow-lg shadow-accent-primary/10"
              : "border-border-default hover:border-border-subtle shadow-md"
          }`}
        >
          <div className="flex h-full w-full max-w-[80%] items-center justify-center">
            <NodeLabelEditor
              isEditing={isEditing}
              label={label}
              draftLabel={draftLabel}
              textColor={textColor}
              textareaRef={textareaRef}
              onChange={handleChange}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              onDoubleClick={handleDoubleClick}
            />
          </div>
        </div>
      )}

      {/* 4. SVG Shapes: diamond */}
      {shape === "diamond" && (
        <div className="relative flex h-full w-full items-center justify-center">
          <svg
            width={w}
            height={h}
            viewBox={`0 0 ${w} ${h}`}
            style={{
              filter: selected
                ? "drop-shadow(0 0 8px rgba(0, 200, 212, 0.45))"
                : "drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3))",
            }}
            className="absolute inset-0 overflow-visible pointer-events-none"
          >
            <polygon
              points={`${w / 2},${inset} ${w - inset},${h / 2} ${w / 2},${h - inset} ${inset},${h / 2}`}
              fill={bgColor}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              className={selected ? "" : "group-hover:stroke-border-subtle transition-colors"}
            />
          </svg>
          <div className="relative z-1 flex max-h-[70%] max-w-[70%] items-center justify-center overflow-hidden px-2 text-center">
            <NodeLabelEditor
              isEditing={isEditing}
              label={label}
              draftLabel={draftLabel}
              textColor={textColor}
              textareaRef={textareaRef}
              onChange={handleChange}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              onDoubleClick={handleDoubleClick}
            />
          </div>
        </div>
      )}

      {/* 5. SVG Shapes: hexagon */}
      {shape === "hexagon" && (
        <div className="relative flex h-full w-full items-center justify-center">
          <svg
            width={w}
            height={h}
            viewBox={`0 0 ${w} ${h}`}
            style={{
              filter: selected
                ? "drop-shadow(0 0 8px rgba(0, 200, 212, 0.45))"
                : "drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3))",
            }}
            className="absolute inset-0 overflow-visible pointer-events-none"
          >
            <polygon
              points={`${inset},${h / 2} ${w * 0.22},${inset} ${w * 0.78},${inset} ${w - inset},${h / 2} ${w * 0.78},${h - inset} ${w * 0.22},${h - inset}`}
              fill={bgColor}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              className={selected ? "" : "group-hover:stroke-border-subtle transition-colors"}
            />
          </svg>
          <div className="relative z-1 flex max-h-[80%] max-w-[75%] items-center justify-center overflow-hidden px-2 text-center">
            <NodeLabelEditor
              isEditing={isEditing}
              label={label}
              draftLabel={draftLabel}
              textColor={textColor}
              textareaRef={textareaRef}
              onChange={handleChange}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              onDoubleClick={handleDoubleClick}
            />
          </div>
        </div>
      )}

      {/* 6. SVG Shapes: cylinder */}
      {shape === "cylinder" && (() => {
        const ry = Math.max(8, Math.min(24, Math.round(h * 0.18)))
        const rx = Math.max(8, (w - 2 * inset) / 2)
        const cx = w / 2
        const bodyHeight = Math.max(0, h - 2 * inset - 2 * ry)
        return (
          <div className="relative flex h-full w-full items-center justify-center">
            <svg
              width={w}
              height={h}
              viewBox={`0 0 ${w} ${h}`}
              style={{
                filter: selected
                  ? "drop-shadow(0 0 8px rgba(0, 200, 212, 0.45))"
                  : "drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3))",
              }}
              className="absolute inset-0 overflow-visible pointer-events-none"
            >
              <path
                d={`M ${inset} ${inset + ry} v ${bodyHeight} a ${rx} ${ry} 0 0 0 ${2 * rx} 0 v ${-bodyHeight} a ${rx} ${ry} 0 0 0 ${-2 * rx} 0 Z`}
                fill={bgColor}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                className={selected ? "" : "group-hover:stroke-border-subtle transition-colors"}
              />
              <ellipse
                cx={cx}
                cy={inset + ry}
                rx={rx}
                ry={ry}
                fill={bgColor}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                vectorEffect="non-scaling-stroke"
                className={selected ? "" : "group-hover:stroke-border-subtle transition-colors"}
              />
            </svg>
            <div className="relative z-1 flex max-h-[75%] max-w-[85%] items-center justify-center overflow-hidden px-2 pt-2 text-center">
              <NodeLabelEditor
                isEditing={isEditing}
                label={label}
                draftLabel={draftLabel}
                textColor={textColor}
                textareaRef={textareaRef}
                onChange={handleChange}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                onDoubleClick={handleDoubleClick}
              />
            </div>
          </div>
        )
      })()}
    </div>
  )
}

export const CanvasNodeRenderer = memo(CanvasNodeComponent)
