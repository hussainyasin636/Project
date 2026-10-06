"use client"

import { useMemo } from "react"
import { ArrowDownToLine, LayoutTemplate } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  CANVAS_TEMPLATES,
  type CanvasTemplate,
} from "@/components/editor/starter-templates"

interface TemplatePreviewProps {
  template: CanvasTemplate
}

/**
 * Lightweight SVG preview fitting diagram nodes and edges into a fixed viewport.
 */
function TemplatePreview({ template }: TemplatePreviewProps) {
  const { viewBox } = useMemo(() => {
    if (template.nodes.length === 0) {
      return { viewBox: "0 0 400 200" }
    }

    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    for (const node of template.nodes) {
      const width = typeof node.style?.width === "number" ? node.style.width : 140
      const height = typeof node.style?.height === "number" ? node.style.height : 70
      minX = Math.min(minX, node.position.x)
      minY = Math.min(minY, node.position.y)
      maxX = Math.max(maxX, node.position.x + width)
      maxY = Math.max(maxY, node.position.y + height)
    }

    const padding = 35
    const width = Math.max(maxX - minX + padding * 2, 120)
    const height = Math.max(maxY - minY + padding * 2, 90)
    const x = minX - padding
    const y = minY - padding

    return { viewBox: `${x} ${y} ${width} ${height}` }
  }, [template])

  const nodeCenterMap = useMemo(() => {
    const map = new Map<string, { cx: number; cy: number }>()
    for (const node of template.nodes) {
      const width = typeof node.style?.width === "number" ? node.style.width : 140
      const height = typeof node.style?.height === "number" ? node.style.height : 70
      map.set(node.id, {
        cx: node.position.x + width / 2,
        cy: node.position.y + height / 2,
      })
    }
    return map
  }, [template])

  return (
    <svg
      viewBox={viewBox}
      className="h-full w-full select-none"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Edges rendered as simple connector lines between node centers */}
      {template.edges.map((edge) => {
        const source = nodeCenterMap.get(edge.source)
        const target = nodeCenterMap.get(edge.target)
        if (!source || !target) return null

        return (
          <line
            key={edge.id}
            x1={source.cx}
            y1={source.cy}
            x2={target.cx}
            y2={target.cy}
            stroke="rgba(240, 240, 244, 0.3)"
            strokeWidth={2}
            strokeDasharray="4 3"
          />
        )
      })}

      {/* Nodes rendered according to shape and color */}
      {template.nodes.map((node) => {
        const width = typeof node.style?.width === "number" ? node.style.width : 140
        const height = typeof node.style?.height === "number" ? node.style.height : 70
        const x = node.position.x
        const y = node.position.y
        const cx = x + width / 2
        const cy = y + height / 2
        const shape = node.data?.shape ?? "rectangle"
        const fill = node.data?.color ?? "#1F1F1F"
        const textColor = node.data?.textColor ?? "#EDEDED"
        const label = node.data?.label ?? ""

        let shapeElement: React.ReactNode = null

        if (shape === "circle") {
          const r = Math.min(width, height) / 2
          shapeElement = (
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill={fill}
              stroke="rgba(255, 255, 255, 0.22)"
              strokeWidth={1.5}
            />
          )
        } else if (shape === "diamond") {
          const points = `${cx},${y} ${x + width},${cy} ${cx},${y + height} ${x},${cy}`
          shapeElement = (
            <polygon
              points={points}
              fill={fill}
              stroke="rgba(255, 255, 255, 0.22)"
              strokeWidth={1.5}
            />
          )
        } else if (shape === "hexagon") {
          const inset = width * 0.15
          const points = `${x + inset},${y} ${x + width - inset},${y} ${x + width},${cy} ${x + width - inset},${y + height} ${x + inset},${y + height} ${x},${cy}`
          shapeElement = (
            <polygon
              points={points}
              fill={fill}
              stroke="rgba(255, 255, 255, 0.22)"
              strokeWidth={1.5}
            />
          )
        } else if (shape === "pill") {
          shapeElement = (
            <rect
              x={x}
              y={y}
              width={width}
              height={height}
              rx={height / 2}
              ry={height / 2}
              fill={fill}
              stroke="rgba(255, 255, 255, 0.22)"
              strokeWidth={1.5}
            />
          )
        } else {
          // rectangle or cylinder fallback
          shapeElement = (
            <rect
              x={x}
              y={y}
              width={width}
              height={height}
              rx={8}
              ry={8}
              fill={fill}
              stroke="rgba(255, 255, 255, 0.22)"
              strokeWidth={1.5}
            />
          )
        }

        return (
          <g key={node.id}>
            {shapeElement}
            <text
              x={cx}
              y={cy}
              fill={textColor}
              fontSize={11}
              fontWeight="600"
              fontFamily="sans-serif"
              textAnchor="middle"
              dominantBaseline="central"
              className="select-none pointer-events-none"
            >
              {label.length > 15 ? label.slice(0, 13) + "…" : label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export interface StarterTemplatesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (template: CanvasTemplate) => void
}

/**
 * Dialog displaying starter architecture templates in a grid.
 */
export function StarterTemplatesModal({
  open,
  onOpenChange,
  onImport,
}: StarterTemplatesModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-6 bg-bg-surface border-border-default rounded-2xl overflow-hidden">
        <DialogHeader className="shrink-0 mb-2">
          <div className="flex items-center gap-2">
            <LayoutTemplate className="h-5 w-5 text-accent-primary" />
            <DialogTitle className="text-lg font-semibold text-text-primary">
              Starter Templates
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-text-secondary">
            Select a pre-built diagram to quickly jumpstart your architecture canvas.
            Importing will replace the current canvas content.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable templates grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 overflow-y-auto py-2 pr-1 max-h-[calc(85vh-120px)]">
          {CANVAS_TEMPLATES.map((template) => (
            <div
              key={template.id}
              className="flex flex-col rounded-xl border border-border-default bg-bg-elevated p-3.5 hover:border-accent-primary/60 transition-all group"
            >
              {/* Lightweight SVG Diagram Preview */}
              <div className="h-36 w-full rounded-lg bg-bg-base/80 border border-border-subtle p-2 mb-3 flex items-center justify-center overflow-hidden">
                <TemplatePreview template={template} />
              </div>

              {/* Template Info */}
              <div className="flex-1 flex flex-col">
                <div className="flex items-center justify-between gap-1 mb-1">
                  <h3 className="text-sm font-semibold text-text-primary group-hover:text-accent-primary transition-colors">
                    {template.name}
                  </h3>
                </div>
                <p className="text-xs text-text-muted mb-3 line-clamp-3 flex-1 leading-relaxed">
                  {template.description}
                </p>

                {/* Metadata tags */}
                <div className="flex items-center gap-2 mb-3 text-[11px] text-text-faint">
                  <span className="rounded bg-bg-subtle px-1.5 py-0.5 border border-border-subtle">
                    {template.nodes.length} nodes
                  </span>
                  <span className="rounded bg-bg-subtle px-1.5 py-0.5 border border-border-subtle">
                    {template.edges.length} edges
                  </span>
                </div>

                {/* Import Button */}
                <Button
                  size="sm"
                  onClick={() => {
                    onImport(template)
                    onOpenChange(false)
                  }}
                  className="w-full h-8 gap-1.5 bg-accent-primary text-bg-base hover:bg-accent-primary/90 font-medium text-xs rounded-lg transition-all cursor-pointer"
                >
                  <ArrowDownToLine className="h-3.5 w-3.5" />
                  Import Template
                </Button>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
