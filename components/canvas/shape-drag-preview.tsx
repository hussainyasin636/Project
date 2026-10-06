"use client"

import { memo } from "react"
import type { NodeShape } from "@/types/canvas"
import { SHAPE_DEFAULT_SIZES } from "@/types/canvas"
import { SHAPES_CONFIG } from "@/components/canvas/shape-panel"

interface ShapeDragPreviewProps {
  shape: NodeShape
  position: { x: number; y: number }
}

/**
 * Renders a ghost drag preview attached to the cursor while dragging
 * a shape from the shape panel onto the canvas.
 */
function ShapeDragPreviewComponent({
  shape,
  position,
}: ShapeDragPreviewProps) {
  const size = SHAPE_DEFAULT_SIZES[shape] || SHAPE_DEFAULT_SIZES.rectangle
  const { width: w, height: h } = size
  const label =
    SHAPES_CONFIG.find((item) => item.shape === shape)?.label || shape

  const ghostFill = "rgba(31, 31, 31, 0.75)"
  const ghostStroke = "var(--accent-primary)"
  const inset = 1.5

  return (
    <div
      style={{
        position: "fixed",
        left: position.x,
        top: position.y,
        width: `${w}px`,
        height: `${h}px`,
        transform: "translate(-50%, -50%)",
        pointerEvents: "none",
        zIndex: 50,
      }}
      className="animate-in fade-in-0 duration-150"
    >
      {/* 1. CSS Shapes: rectangle */}
      {shape === "rectangle" && (
        <div
          style={{ width: `${w}px`, height: `${h}px`, backgroundColor: ghostFill }}
          className="flex items-center justify-center rounded-xl border-2 border-dashed border-accent-primary shadow-[0_0_16px_rgba(0,200,212,0.35)] backdrop-blur-xs"
        >
          <span className="text-center text-xs font-semibold tracking-wider text-accent-primary/80 uppercase select-none">
            {label}
          </span>
        </div>
      )}

      {/* 2. CSS Shapes: pill */}
      {shape === "pill" && (
        <div
          style={{ width: `${w}px`, height: `${h}px`, backgroundColor: ghostFill }}
          className="flex items-center justify-center rounded-full border-2 border-dashed border-accent-primary shadow-[0_0_16px_rgba(0,200,212,0.35)] backdrop-blur-xs"
        >
          <span className="text-center text-xs font-semibold tracking-wider text-accent-primary/80 uppercase select-none">
            {label}
          </span>
        </div>
      )}

      {/* 3. CSS Shapes: circle */}
      {shape === "circle" && (
        <div
          style={{ width: `${w}px`, height: `${h}px`, backgroundColor: ghostFill }}
          className="flex items-center justify-center rounded-full border-2 border-dashed border-accent-primary shadow-[0_0_16px_rgba(0,200,212,0.35)] backdrop-blur-xs"
        >
          <span className="text-center text-xs font-semibold tracking-wider text-accent-primary/80 uppercase select-none">
            {label}
          </span>
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
              filter: "drop-shadow(0 0 10px rgba(0, 200, 212, 0.4))",
            }}
            className="absolute inset-0 overflow-visible"
          >
            <polygon
              points={`${w / 2},${inset} ${w - inset},${h / 2} ${w / 2},${h - inset} ${inset},${h / 2}`}
              fill={ghostFill}
              stroke={ghostStroke}
              strokeWidth={2}
              strokeDasharray="4 3"
              strokeLinejoin="round"
            />
          </svg>
          <span className="relative z-10 max-w-[70%] text-center text-xs font-semibold tracking-wider text-accent-primary/80 uppercase select-none">
            {label}
          </span>
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
              filter: "drop-shadow(0 0 10px rgba(0, 200, 212, 0.4))",
            }}
            className="absolute inset-0 overflow-visible"
          >
            <polygon
              points={`${inset},${h / 2} ${w * 0.22},${inset} ${w * 0.78},${inset} ${w - inset},${h / 2} ${w * 0.78},${h - inset} ${w * 0.22},${h - inset}`}
              fill={ghostFill}
              stroke={ghostStroke}
              strokeWidth={2}
              strokeDasharray="4 3"
              strokeLinejoin="round"
            />
          </svg>
          <span className="relative z-10 max-w-[75%] text-center text-xs font-semibold tracking-wider text-accent-primary/80 uppercase select-none">
            {label}
          </span>
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
                filter: "drop-shadow(0 0 10px rgba(0, 200, 212, 0.4))",
              }}
              className="absolute inset-0 overflow-visible"
            >
              <path
                d={`M ${inset} ${inset + ry} v ${bodyHeight} a ${rx} ${ry} 0 0 0 ${2 * rx} 0 v ${-bodyHeight} a ${rx} ${ry} 0 0 0 ${-2 * rx} 0 Z`}
                fill={ghostFill}
                stroke={ghostStroke}
                strokeWidth={2}
                strokeDasharray="4 3"
                strokeLinejoin="round"
              />
              <ellipse
                cx={cx}
                cy={inset + ry}
                rx={rx}
                ry={ry}
                fill={ghostFill}
                stroke={ghostStroke}
                strokeWidth={2}
                strokeDasharray="4 3"
              />
            </svg>
            <span className="relative z-10 max-w-[85%] pt-2 text-center text-xs font-semibold tracking-wider text-accent-primary/80 uppercase select-none">
              {label}
            </span>
          </div>
        )
      })()}
    </div>
  )
}

export const ShapeDragPreview = memo(ShapeDragPreviewComponent)
