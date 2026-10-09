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
  SelectionMode,
  useReactFlow,
  useNodes,
  useEdges,
  getConnectedEdges,
  type NodeAddChange,
  type Connection,
} from "@xyflow/react"
import { useLiveblocksFlow } from "@liveblocks/react-flow"
import {
  useMutation,
  useUndo,
  useRedo,
  useCanUndo,
  useCanRedo,
  useUpdateMyPresence,
  useRoom,
} from "@liveblocks/react/suspense"
import { LiveObject, LiveMap, type JsonObject } from "@liveblocks/client"
import { CanvasNodeRenderer } from "@/components/canvas/canvas-node"
import { CanvasEdgeRenderer } from "@/components/canvas/canvas-edge"
import { ShapePanel } from "@/components/canvas/shape-panel"
import { ShapeDragPreview } from "@/components/canvas/shape-drag-preview"
import { CanvasControlBar } from "@/components/canvas/canvas-control-bar"
import { LiveCursors } from "@/components/canvas/live-cursors"
import { StarterTemplatesModal } from "@/components/editor/starter-templates-modal"
import type { CanvasTemplate } from "@/components/editor/starter-templates"
import { useWorkspace } from "@/hooks/use-workspace"
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts"
import { useCanvasAutosave } from "@/hooks/use-canvas-autosave"
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

function CanvasFlow({ projectId }: { projectId?: string } = {}) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const reactFlow = useReactFlow()
  const { screenToFlowPosition } = reactFlow
  const room = useRoom()
  const workspace = useWorkspace()

  const effectiveProjectId = projectId || room?.id || workspace?.activeProject?.id

  const undo = useUndo()
  const redo = useRedo()
  const canUndo = useCanUndo()
  const canRedo = useCanRedo()
  const updateMyPresence = useUpdateMyPresence()

  // Broadcast cursor position on React Flow mouse movement
  const handleMouseMove = useCallback(
    (event: React.MouseEvent) => {
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })
      updateMyPresence({ cursor: position })
    },
    [screenToFlowPosition, updateMyPresence]
  )

  // Clear cursor position on mouse leave or window blur
  const handleMouseLeave = useCallback(() => {
    updateMyPresence({ cursor: null })
  }, [updateMyPresence])

  useEffect(() => {
    const handleBlur = () => {
      updateMyPresence({ cursor: null })
    }
    window.addEventListener("blur", handleBlur)
    return () => {
      window.removeEventListener("blur", handleBlur)
      updateMyPresence({ cursor: null })
    }
  }, [updateMyPresence])

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

  // Get current nodes and edges with their selection states
  const rfNodes = useNodes<CanvasNode>()
  const rfEdges = useEdges<CanvasEdge>()

  // Delete selected nodes and edges via Liveblocks collaborative mutation helper
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) {
        return
      }

      if (event.key !== "Delete" && event.key !== "Backspace") {
        return
      }

      const target = event.target as HTMLElement | null
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable ||
          target.closest?.(
            "input, textarea, select, [contenteditable='true'], [role='textbox']"
          ))
      ) {
        return
      }

      const selectedNodes = rfNodes.filter((node) => Boolean(node.selected))
      const selectedEdges = rfEdges.filter((edge) => Boolean(edge.selected))

      if (selectedNodes.length === 0 && selectedEdges.length === 0) {
        return
      }

      event.preventDefault()

      // Include all edges connected to the selected nodes
      const connectedEdges = getConnectedEdges(selectedNodes, rfEdges)
      const edgeMap = new Map<string, CanvasEdge>()
      for (const edge of selectedEdges) {
        edgeMap.set(edge.id, edge)
      }
      for (const edge of connectedEdges) {
        edgeMap.set(edge.id, edge)
      }
      const allEdgesToDelete = Array.from(edgeMap.values())

      onDelete({
        nodes: selectedNodes,
        edges: allEdgesToDelete,
      })
    }

    const wrapper = reactFlowWrapper.current
    if (wrapper) {
      wrapper.addEventListener("keydown", handleKeyDown)
    }
    window.addEventListener("keydown", handleKeyDown)

    return () => {
      if (wrapper) {
        wrapper.removeEventListener("keydown", handleKeyDown)
      }
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [rfNodes, rfEdges, onDelete])

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

  // Liveblocks mutation to load saved canvas from blob storage into room
  const loadSavedCanvas = useMutation(
    ({ storage }, savedNodes: CanvasNode[], savedEdges: CanvasEdge[]) => {
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

      // Check to ensure we do not overwrite active collaboration if nodes appeared
      if (nodesMap.size > 0) {
        return
      }

      let edgesMap = flow.get("edges")
      if (!edgesMap) {
        edgesMap = new LiveMap()
        flow.set("edges", edgesMap)
      }

      for (const node of savedNodes) {
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

      for (const edge of savedEdges) {
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

  const [hasCheckedSavedState, setHasCheckedSavedState] = useState(
    () => nodes.length > 0 || edges.length > 0
  )
  const hasCheckedRoomRef = useRef(false)

  // Initialize autosave hook
  const { saveStatus, saveNow, markAsSaved } = useCanvasAutosave({
    projectId: effectiveProjectId,
    nodes,
    edges,
    debounceMs: 2000,
    enabled: hasCheckedSavedState,
  })

  const setSaveStatus = workspace?.setSaveStatus
  // Synchronize autosave status with workspace context for EditorNavbar Save button
  useEffect(() => {
    if (setSaveStatus) {
      setSaveStatus(saveStatus)
    }
  }, [saveStatus, setSaveStatus])

  const setOnSave = workspace?.setOnSave
  // Register manual save handler in workspace context
  useEffect(() => {
    if (setOnSave) {
      setOnSave(saveNow)
    }
    return () => {
      if (setOnSave) {
        setOnSave(undefined)
      }
    }
  }, [saveNow, setOnSave])

  // Initial load check: load saved canvas state if room is empty
  useEffect(() => {
    // If already checked or room is not empty, skip the load entirely to avoid overwriting active collaboration
    if (hasCheckedRoomRef.current || hasCheckedSavedState || !effectiveProjectId) {
      return
    }

    if (nodes.length > 0 || edges.length > 0) {
      hasCheckedRoomRef.current = true
      return
    }

    hasCheckedRoomRef.current = true
    let isCancelled = false

    async function loadSavedState() {
      try {
        const res = await fetch(`/api/projects/${effectiveProjectId}/canvas`)
        if (!res.ok) {
          return
        }
        const data = await res.json()
        if (isCancelled) return

        const savedNodes: CanvasNode[] = data.nodes || []
        const savedEdges: CanvasEdge[] = data.edges || []

        if (savedNodes.length === 0 && savedEdges.length === 0) {
          return
        }

        // Secondary safety check: did another collaborator add nodes while we were fetching?
        if (nodes.length > 0 || edges.length > 0) {
          return
        }

        // Populate Liveblocks CRDT storage and React Flow state
        loadSavedCanvas(savedNodes, savedEdges)
        reactFlow.setNodes(savedNodes)
        reactFlow.setEdges(savedEdges)
        markAsSaved(savedNodes, savedEdges)

        setTimeout(() => {
          reactFlow.fitView({ duration: 400, padding: 0.2 })
        }, 50)
      } catch (err) {
        console.warn("[Canvas] Error loading saved canvas state:", err)
      } finally {
        if (!isCancelled) {
          setHasCheckedSavedState(true)
        }
      }
    }

    void loadSavedState()

    return () => {
      isCancelled = true
    }
  }, [
    effectiveProjectId,
    hasCheckedSavedState,
    nodes,
    edges,
    loadSavedCanvas,
    reactFlow,
    markAsSaved,
  ])

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
      event.stopPropagation()
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
        style: {
          width: size.width,
          height: size.height,
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
        style: {
          width: size.width,
          height: size.height,
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
      tabIndex={0}
      className="relative h-full w-full overflow-hidden bg-bg-base select-none outline-none focus:outline-none"
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
        deleteKeyCode={null}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        connectionMode={ConnectionMode.Loose}
        selectionMode={SelectionMode.Partial}
        multiSelectionKeyCode={["Meta", "Control"]}
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
        <LiveCursors />
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

export function Canvas({ projectId }: { projectId?: string } = {}) {
  return (
    <ReactFlowProvider>
      <CanvasFlow projectId={projectId} />
    </ReactFlowProvider>
  )
}
