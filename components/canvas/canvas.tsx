"use client"

import { useCallback, useMemo, useRef, type DragEvent } from "react"
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  MiniMap,
  ConnectionMode,
  useReactFlow,
  type NodeAddChange,
} from "@xyflow/react"
import { useLiveblocksFlow, Cursors } from "@liveblocks/react-flow"
import { CanvasNodeRenderer } from "@/components/canvas/canvas-node"
import { ShapePanel } from "@/components/canvas/shape-panel"
import type { CanvasNode, CanvasEdge, NodeShape } from "@/types/canvas"
import {
  DEFAULT_NODE_COLOR,
  NODE_SHAPES,
  SHAPE_DEFAULT_SIZES,
} from "@/types/canvas"

import "@xyflow/react/dist/style.css"
import "@liveblocks/react-flow/styles.css"

let nodeCounter = 0

function generateNodeId(shape: string): string {
  nodeCounter += 1
  return `${shape}-${Date.now()}-${nodeCounter}`
}

function CanvasFlow() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const { screenToFlowPosition } = useReactFlow()
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onDelete,
  } = useLiveblocksFlow<CanvasNode, CanvasEdge>({
    suspense: true,
    nodes: {
      initial: [],
    },
    edges: {
      initial: [],
    },
  })

  const nodeTypes = useMemo(
    () => ({
      canvasNode: CanvasNodeRenderer,
    }),
    []
  )

  const handleDragOver = useCallback((event: DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
    event.dataTransfer.dropEffect = "move"
  }, [])

  const handleDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault()
      event.stopPropagation()

      let shape: NodeShape = "rectangle"
      let size = SHAPE_DEFAULT_SIZES.rectangle

      const rfData = event.dataTransfer.getData("application/reactflow")
      const jsonData = event.dataTransfer.getData("application/json")
      const textData = event.dataTransfer.getData("text/plain")

      const rawPayload = rfData || jsonData
      if (rawPayload) {
        try {
          const parsed = JSON.parse(rawPayload)
          if (parsed.shape && NODE_SHAPES.includes(parsed.shape)) {
            shape = parsed.shape as NodeShape
          }
          if (parsed.size?.width && parsed.size?.height) {
            size = parsed.size
          } else if (SHAPE_DEFAULT_SIZES[shape]) {
            size = SHAPE_DEFAULT_SIZES[shape]
          }
        } catch {
          if (textData && NODE_SHAPES.includes(textData as NodeShape)) {
            shape = textData as NodeShape
            size = SHAPE_DEFAULT_SIZES[shape]
          }
        }
      } else if (textData && NODE_SHAPES.includes(textData as NodeShape)) {
        shape = textData as NodeShape
        size = SHAPE_DEFAULT_SIZES[shape]
      }

      // Convert screen position to canvas coordinates using React Flow
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      // Create new node centered around cursor
      const newNode: CanvasNode = {
        id: generateNodeId(shape),
        type: "canvasNode",
        position: {
          x: position.x - size.width / 2,
          y: position.y - size.height / 2,
        },
        data: {
          label: "",
          color: DEFAULT_NODE_COLOR,
          shape,
        },
      }

      const addChange: NodeAddChange<CanvasNode> = {
        type: "add",
        item: newNode,
      }
      onNodesChange([addChange])
    },
    [screenToFlowPosition, onNodesChange]
  )

  // Clicking a shape in the bottom toolbar adds it in the center of the current canvas viewport
  const handleAddShape = useCallback(
    (shape: NodeShape) => {
      const size = SHAPE_DEFAULT_SIZES[shape] || SHAPE_DEFAULT_SIZES.rectangle

      const container = reactFlowWrapper.current
      const width = container?.clientWidth || window.innerWidth
      const height = container?.clientHeight || window.innerHeight

      const centerScreen = {
        x: width / 2,
        y: height / 2,
      }
      const position = screenToFlowPosition(centerScreen)

      const newNode: CanvasNode = {
        id: generateNodeId(shape),
        type: "canvasNode",
        position: {
          x: position.x - size.width / 2,
          y: position.y - size.height / 2,
        },
        data: {
          label: "",
          color: DEFAULT_NODE_COLOR,
          shape,
        },
      }

      const addChange: NodeAddChange<CanvasNode> = {
        type: "add",
        item: newNode,
      }
      onNodesChange([addChange])
    },
    [screenToFlowPosition, onNodesChange]
  )

  return (
    <div
      ref={reactFlowWrapper}
      className="relative h-full w-full overflow-hidden bg-bg-base select-none"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDelete={onDelete}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        connectionMode={ConnectionMode.Loose}
        fitView
        colorMode="dark"
        className="h-full w-full bg-bg-base"
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1.5}
          color="#2a2a30"
          className="bg-bg-base"
        />
        <MiniMap
          zoomable
          pannable
          className="!bg-bg-surface/90 !border-border-default !rounded-xl overflow-hidden shadow-lg backdrop-blur-sm"
          nodeColor="#3a3a42"
          maskColor="rgba(8, 8, 9, 0.75)"
        />
        <Cursors />
      </ReactFlow>

      {/* Floating shape toolbar at bottom-center of canvas */}
      <ShapePanel onAddShape={handleAddShape} />
    </div>
  )
}

export function Canvas() {
  return (
    <ReactFlowProvider>
      <CanvasFlow />
    </ReactFlowProvider>
  )
}
