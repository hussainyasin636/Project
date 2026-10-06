"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
} from "react"
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  ConnectionMode,
  useReactFlow,
  type NodeAddChange,
  type Connection,
} from "@xyflow/react"
import { useLiveblocksFlow, Cursors } from "@liveblocks/react-flow"
import {
  useMutation,
  useUndo,
  useRedo,
  useCanUndo,
  useCanRedo,
} from "@liveblocks/react/suspense"
import { LiveObject, LiveMap, type JsonObject } from "@liveblocks/client"
import { CanvasNodeRenderer } from "@/components/canvas/canvas-node"
import { CanvasEdgeRenderer } from "@/components/canvas/canvas-edge"
import { ShapePanel } from "@/components/canvas/shape-panel"
import { ShapeDragPreview } from "@/components/canvas/shape-drag-preview"
import { CanvasControlBar } from "@/components/canvas/canvas-control-bar"
import { StarterTemplatesModal } from "@/components/editor/starter-templates-modal"
import type { CanvasTemplate } from "@/components/editor/starter-templates"
import { useWorkspace } from "@/hooks/use-workspace"
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts"
import type { CanvasNode, CanvasEdge, NodeShape } from "@/types/canvas"
import {
  DEFAULT_NODE_COLOR,
  DEFAULT_NODE_TEXT_COLOR,
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
  const reactFlow = useReactFlow()
  const { screenToFlowPosition } = reactFlow

  const undo = useUndo()
  const redo = useRedo()
  const canUndo = useCanUndo()
  const canRedo = useCanRedo()
  const workspace = useWorkspace()

  // Wire canvas zoom and history shortcuts (skips editable inputs/textareas)
  useKeyboardShortcuts({
    reactFlow,
    undo,
    redo,
  })

  // Drag preview state
  const [draggedShape, setDraggedShape] = useState<NodeShape | null>(null)
  const [dragCursor, setDragCursor] = useState<{ x: number; y: number } | null>(
    null
  )

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
      sync: {
        "*": {
          label: "atomic",
          color: "atomic",
          textColor: "atomic",
          shape: "atomic",
        },
      },
    },
    edges: {
      initial: [],
      sync: {
        "*": {
          label: "atomic",
        },
      },
    },
  })

  // Liveblocks mutation ensuring flow and nodes exist and store with atomic position and data
  const addNodeToStorage = useMutation(({ storage }, newNode: CanvasNode) => {
    let flow = storage.get("flow")
    if (!flow) {
      flow = new LiveObject({
        nodes: new LiveMap(),
        edges: new LiveMap(),
      })
      storage.set("flow", flow)
    }
    let nodesMap = flow.get("nodes")
    if (!nodesMap) {
      nodesMap = new LiveMap()
      flow.set("nodes", nodesMap)
    }
    nodesMap.set(
      newNode.id,
      LiveObject.from(newNode as unknown as JsonObject, {
        position: "atomic",
        sourcePosition: "atomic",
        targetPosition: "atomic",
        extent: "atomic",
        origin: "atomic",
        handles: "atomic",
        data: "atomic",
      })
    )
  }, [])

  // Liveblocks mutation to clear existing canvas and populate with starter template
  const replaceCanvasWithTemplate = useMutation(
    ({ storage }, template: CanvasTemplate) => {
      let flow = storage.get("flow")
      if (!flow) {
        flow = new LiveObject({
          nodes: new LiveMap(),
          edges: new LiveMap(),
        })
        storage.set("flow", flow)
      }

      let nodesMap = flow.get("nodes")
      if (!nodesMap) {
        nodesMap = new LiveMap()
        flow.set("nodes", nodesMap)
      } else {
        // Clear all existing nodes first
        const nodeKeys = Array.from(nodesMap.keys())
        for (const key of nodeKeys) {
          nodesMap.delete(key)
        }
      }

      let edgesMap = flow.get("edges")
      if (!edgesMap) {
        edgesMap = new LiveMap()
        flow.set("edges", edgesMap)
      } else {
        // Clear all existing edges first
        const edgeKeys = Array.from(edgesMap.keys())
        for (const key of edgeKeys) {
          edgesMap.delete(key)
        }
      }

      // Add template nodes after canvas is cleared
      for (const node of template.nodes) {
        nodesMap.set(
          node.id,
          LiveObject.from(node as unknown as JsonObject, {
            position: "atomic",
            sourcePosition: "atomic",
            targetPosition: "atomic",
            extent: "atomic",
            origin: "atomic",
            handles: "atomic",
            data: "atomic",
          })
        )
      }

      // Add template edges after canvas is cleared
      for (const edge of template.edges) {
        edgesMap.set(
          edge.id,
          LiveObject.from(edge as unknown as JsonObject, {
            data: "atomic",
          })
        )
      }
    },
    []
  )

  const handleImportTemplate = useCallback(
    (template: CanvasTemplate) => {
      // 1. Replace nodes and edges in collaborative Liveblocks CRDT storage
      replaceCanvasWithTemplate(template)

      // 2. Synchronously replace local React Flow nodes and edges
      reactFlow.setNodes(template.nodes)
      reactFlow.setEdges(template.edges)

      // 3. Smoothly fit view after template is loaded
      setTimeout(() => {
        reactFlow.fitView({ duration: 400, padding: 0.2 })
      }, 50)
    },
    [replaceCanvasWithTemplate, reactFlow]
  )

  const nodeTypes = useMemo(
    () => ({
      canvasNode: CanvasNodeRenderer,
    }),
    []
  )

  const edgeTypes = useMemo(
    () => ({
      canvasEdge: CanvasEdgeRenderer,
    }),
    []
  )

  const handleConnect = useCallback(
    (connection: Connection) => {
      onConnect({
        ...connection,
        type: "canvasEdge",
        data: { label: "" },
      } as unknown as Connection)
    },
    [onConnect]
  )

  // Handlers for drag preview lifecycle
  const handleDragStartShape = useCallback((shape: NodeShape) => {
    setDraggedShape(shape)
  }, [])

  const handleDragEndShape = useCallback(() => {
    setDraggedShape(null)
    setDragCursor(null)
  }, [])

  // Window dragend listener ensures ghost is cleaned up on cancelled drag
  useEffect(() => {
    const handleGlobalDragEnd = () => {
      setDraggedShape(null)
      setDragCursor(null)
    }
    window.addEventListener("dragend", handleGlobalDragEnd)
    window.addEventListener("drop", handleGlobalDragEnd)
    return () => {
      window.removeEventListener("dragend", handleGlobalDragEnd)
      window.removeEventListener("drop", handleGlobalDragEnd)
    }
  }, [])

  const handleDragOver = useCallback((event: DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
    setDragCursor({ x: event.clientX, y: event.clientY })
  }, [])

  const handleDragLeave = useCallback((event: DragEvent) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node)) {
      setDragCursor(null)
    }
  }, [])

  const handleDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault()
      setDraggedShape(null)
      setDragCursor(null)

      let shape: NodeShape = "rectangle"
      let size = SHAPE_DEFAULT_SIZES.rectangle

      const rfData = event.dataTransfer.getData("application/reactflow")
      const jsonData = event.dataTransfer.getData("application/json")
      const textData = event.dataTransfer.getData("text/plain")

      const raw = rfData || jsonData || textData
      if (raw) {
        if (NODE_SHAPES.includes(raw as NodeShape)) {
          shape = raw as NodeShape
          size = SHAPE_DEFAULT_SIZES[shape]
        } else {
          try {
            const parsed = JSON.parse(raw)
            if (parsed && typeof parsed === "object") {
              if (parsed.shape && NODE_SHAPES.includes(parsed.shape)) {
                shape = parsed.shape as NodeShape
              }
              if (parsed.size?.width && parsed.size?.height) {
                size = parsed.size
              } else if (SHAPE_DEFAULT_SIZES[shape]) {
                size = SHAPE_DEFAULT_SIZES[shape]
              }
            }
          } catch {
            if (NODE_SHAPES.includes(textData as NodeShape)) {
              shape = textData as NodeShape
              size = SHAPE_DEFAULT_SIZES[shape]
            }
          }
        }
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
          x: Math.round(position.x - size.width / 2),
          y: Math.round(position.y - size.height / 2),
        },
        data: {
          label: "",
          color: DEFAULT_NODE_COLOR,
          textColor: DEFAULT_NODE_TEXT_COLOR,
          shape,
        },
      }

      // Persist to Liveblocks storage
      addNodeToStorage(newNode)

      // Notify React Flow of change
      try {
        const addChange: NodeAddChange<CanvasNode> = {
          type: "add",
          item: newNode,
        }
        onNodesChange([addChange])
      } catch (err) {
        console.warn("[Canvas] onNodesChange add notice:", err)
      }
    },
    [screenToFlowPosition, addNodeToStorage, onNodesChange]
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
          x: Math.round(position.x - size.width / 2),
          y: Math.round(position.y - size.height / 2),
        },
        data: {
          label: "",
          color: DEFAULT_NODE_COLOR,
          textColor: DEFAULT_NODE_TEXT_COLOR,
          shape,
        },
      }

      // Persist to Liveblocks storage
      addNodeToStorage(newNode)

      try {
        const addChange: NodeAddChange<CanvasNode> = {
          type: "add",
          item: newNode,
        }
        onNodesChange([addChange])
      } catch (err) {
        console.warn("[Canvas] onNodesChange add notice:", err)
      }
    },
    [screenToFlowPosition, addNodeToStorage, onNodesChange]
  )

  return (
    <div
      ref={reactFlowWrapper}
      className="relative h-full w-full overflow-hidden bg-bg-base select-none"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{
          type: "canvasEdge",
        }}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
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
        <Cursors />
      </ReactFlow>

      {/* Floating control bar for zoom and history at bottom-left */}
      <CanvasControlBar
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
      />

      {/* Drag preview ghost attached to cursor */}
      {draggedShape && dragCursor && (
        <ShapeDragPreview shape={draggedShape} position={dragCursor} />
      )}

      {/* Floating shape toolbar at bottom-center of canvas */}
      <ShapePanel
        onAddShape={handleAddShape}
        onDragStartShape={handleDragStartShape}
        onDragEndShape={handleDragEndShape}
      />

      {/* Starter Templates Modal */}
      <StarterTemplatesModal
        open={Boolean(workspace?.isTemplatesModalOpen)}
        onOpenChange={(open) => workspace?.setIsTemplatesModalOpen(open)}
        onImport={handleImportTemplate}
      />
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
