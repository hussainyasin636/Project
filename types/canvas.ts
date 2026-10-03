import type { Node, Edge } from "@xyflow/react"

/**
 * 6 supported node shapes defined in the system specification.
 */
export type NodeShape =
  | "rectangle"
  | "diamond"
  | "circle"
  | "pill"
  | "cylinder"
  | "hexagon"

export const NODE_SHAPES: readonly NodeShape[] = [
  "rectangle",
  "diamond",
  "circle",
  "pill",
  "cylinder",
  "hexagon",
] as const

/**
 * Sensible default dimensions for each node shape.
 */
export interface ShapeSize {
  width: number
  height: number
}

export const SHAPE_DEFAULT_SIZES: Record<NodeShape, ShapeSize> = {
  rectangle: { width: 160, height: 80 },
  diamond: { width: 130, height: 130 },
  circle: { width: 90, height: 90 },
  pill: { width: 150, height: 60 },
  cylinder: { width: 120, height: 90 },
  hexagon: { width: 130, height: 90 },
}

/**
 * 8 defined node color pairs from ui-context.md.
 * Each specifies a dark node fill and contrasting text color.
 */
export interface NodeColorPair {
  fill: string
  text: string
  name: string
}

export const NODE_COLORS: Record<string, NodeColorPair> = {
  neutral: { fill: "#1F1F1F", text: "#EDEDED", name: "Neutral dark (default)" },
  blue: { fill: "#10233D", text: "#52A8FF", name: "Blue" },
  purple: { fill: "#2E1938", text: "#BF7AF0", name: "Purple" },
  orange: { fill: "#331B00", text: "#FF990A", name: "Orange" },
  red: { fill: "#3C1618", text: "#FF6166", name: "Red" },
  pink: { fill: "#3A1726", text: "#F75F8F", name: "Pink" },
  green: { fill: "#0F2E18", text: "#62C073", name: "Green" },
  teal: { fill: "#062822", text: "#0AC7B4", name: "Teal" },
}

export const DEFAULT_NODE_COLOR = "#1F1F1F"
export const DEFAULT_NODE_TEXT_COLOR = "#EDEDED"

/**
 * Custom node data supporting label, color, and shape.
 */
export interface CanvasNodeData extends Record<string, unknown> {
  label: string
  color?: string
  shape?: NodeShape
}

/**
 * Custom node and edge type identifiers.
 */
export const CANVAS_NODE_TYPE = "canvasNode" as const
export const CANVAS_EDGE_TYPE = "canvasEdge" as const

export type CanvasNodeType = typeof CANVAS_NODE_TYPE
export type CanvasEdgeType = typeof CANVAS_EDGE_TYPE

/**
 * Shared Canvas Node and Edge types for React Flow.
 */
export type CanvasNode = Node<CanvasNodeData, CanvasNodeType>
export type CanvasEdge = Edge<Record<string, unknown>, CanvasEdgeType>
