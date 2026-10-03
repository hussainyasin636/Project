"use client"

import { type DragEvent } from "react"
import {
  Square,
  Diamond,
  Circle,
  Pill,
  Cylinder,
  Hexagon,
} from "lucide-react"
import type { NodeShape, ShapeSize } from "@/types/canvas"
import { SHAPE_DEFAULT_SIZES } from "@/types/canvas"

export interface ShapeConfig {
  shape: NodeShape
  label: string
  icon: typeof Square
  size: ShapeSize
}

export const SHAPES_CONFIG: readonly ShapeConfig[] = [
  {
    shape: "rectangle",
    label: "Rectangle",
    icon: Square,
    size: SHAPE_DEFAULT_SIZES.rectangle,
  },
  {
    shape: "diamond",
    label: "Diamond",
    icon: Diamond,
    size: SHAPE_DEFAULT_SIZES.diamond,
  },
  {
    shape: "circle",
    label: "Circle",
    icon: Circle,
    size: SHAPE_DEFAULT_SIZES.circle,
  },
  {
    shape: "pill",
    label: "Pill",
    icon: Pill,
    size: SHAPE_DEFAULT_SIZES.pill,
  },
  {
    shape: "cylinder",
    label: "Cylinder",
    icon: Cylinder,
    size: SHAPE_DEFAULT_SIZES.cylinder,
  },
  {
    shape: "hexagon",
    label: "Hexagon",
    icon: Hexagon,
    size: SHAPE_DEFAULT_SIZES.hexagon,
  },
] as const

interface ShapePanelProps {
  onAddShape?: (shape: NodeShape) => void
}

/**
 * Floating pill-shaped toolbar at the bottom-center of the canvas
 * providing draggable and clickable shape buttons.
 */
export function ShapePanel({ onAddShape }: ShapePanelProps) {
  const handleDragStart = (
    event: DragEvent<HTMLDivElement>,
    shapeConfig: ShapeConfig
  ) => {
    const payload = JSON.stringify({
      shape: shapeConfig.shape,
      size: shapeConfig.size,
    })
    event.dataTransfer.setData("application/reactflow", payload)
    event.dataTransfer.setData("application/json", payload)
    event.dataTransfer.setData("text/plain", shapeConfig.shape)
    event.dataTransfer.effectAllowed = "move"
  }

  return (
    <div
      role="toolbar"
      aria-label="Canvas shape toolbar"
      className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 rounded-full border border-border-default bg-bg-surface/90 px-3.5 py-1.5 shadow-2xl backdrop-blur-md select-none"
    >
      {SHAPES_CONFIG.map((item) => {
        const Icon = item.icon
        return (
          <div
            key={item.shape}
            role="button"
            tabIndex={0}
            draggable
            onDragStart={(e) => handleDragStart(e, item)}
            onClick={() => onAddShape?.(item.shape)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                onAddShape?.(item.shape)
              }
            }}
            title={`Drag onto canvas or click to add ${item.label}`}
            aria-label={`Drag or click to add ${item.label}`}
            className="flex h-9 w-9 items-center justify-center rounded-full text-text-secondary hover:bg-bg-elevated hover:text-text-primary active:scale-95 transition-all cursor-grab active:cursor-grabbing focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-primary"
          >
            <Icon className="h-4 w-4 pointer-events-none select-none" />
          </div>
        )
      })}
    </div>
  )
}
