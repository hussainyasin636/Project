import { task } from "@trigger.dev/sdk"
import { generateText } from "ai"
import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { liveblocks } from "@/lib/liveblocks"
import { LiveObject, LiveMap, type LsonObject } from "@liveblocks/client"
import {
  NODE_SHAPES,
  NODE_COLORS,
  SHAPE_DEFAULT_SIZES,
  DEFAULT_NODE_COLOR,
  DEFAULT_NODE_TEXT_COLOR,
  type NodeShape,
} from "@/types/canvas"

export interface DesignTaskPayload {
  prompt: string
  roomId: string
  projectId?: string
}

export type DesignAgentAction =
  | {
      type: "add_node"
      id: string
      label: string
      shape?: NodeShape
      color?: string
      textColor?: string
      position: { x: number; y: number }
      size?: { width: number; height: number }
    }
  | {
      type: "move_node"
      id: string
      position: { x: number; y: number }
    }
  | {
      type: "resize_node"
      id: string
      size: { width: number; height: number }
    }
  | {
      type: "update_node_data"
      id: string
      label?: string
      shape?: NodeShape
      color?: string
      textColor?: string
    }
  | {
      type: "delete_node"
      id: string
    }
  | {
      type: "add_edge"
      id: string
      source: string
      target: string
      label?: string
      sourceHandle?: "top" | "right" | "bottom" | "left"
      targetHandle?: "top" | "right" | "bottom" | "left"
    }
  | {
      type: "delete_edge"
      id: string
    }

export interface DesignAgentResult {
  success: boolean
  prompt: string
  roomId: string
  projectId?: string
  summary?: string
  actionsCount?: number
  error?: string
}

const SYSTEM_PROMPT = `You are Ghost AI, a world-class cloud systems architect and visual software designer.
Your mission is to interpret the user's natural language request and generate or modify a clean, elegant, production-grade system design graph.

CANVAS DESIGN SPECIFICATIONS:

1. Node Shapes (Use the right shape for the architectural role):
- "rectangle": General compute service, microservice, API server, backend app (width: 160, height: 80)
- "diamond": Decision gateway, router, load balancer, reverse proxy (width: 130, height: 130)
- "circle": Client app, user ingress, mobile/web client, endpoint (width: 90, height: 90)
- "pill": Worker process, asynchronous job, background processor (width: 150, height: 60)
- "cylinder": Database, persistent store, cache, state store (width: 120, height: 90)
- "hexagon": External service, third-party API, OAuth provider, SaaS boundary (width: 130, height: 90)

2. Color Palette (Strictly use these paired hex colors from ui-context.md):
- Neutral (Compute / Service): fill="#1F1F1F", text="#EDEDED"
- Blue (Ingress / Gateway / CDN): fill="#10233D", text="#52A8FF"
- Purple (Core Microservices): fill="#2E1938", text="#BF7AF0"
- Orange (Event streams / Queues / Kafka): fill="#331B00", text="#FF990A"
- Red (Security / Auth / Firewalls): fill="#3C1618", text="#FF6166"
- Pink (External SaaS / Notifications): fill="#3A1726", text="#F75F8F"
- Green (Databases / PostgreSQL / Storage): fill="#0F2E18", text="#62C073"
- Teal (Analytics / Monitoring / Metrics): fill="#062822", text="#0AC7B4"

3. Layout and Spacing Rules:
- Layout in a clear, flowing pipeline (usually left-to-right or top-to-bottom).
- Horizontal Layering (left to right):
  * Layer 1 (x: 80 to 140): Users, Web/Mobile Clients, Ingress
  * Layer 2 (x: 320 to 380): API Gateway, Load Balancer, Ingress Routing
  * Layer 3 (x: 580 to 660): Business Logic Services, Auth, Core Compute
  * Layer 4 (x: 880 to 980): Persistent Databases (Postgres, Mongo), Caches (Redis), Message Queues
  * Layer 5 (x: 1180 to 1260): Background Workers, Third-party APIs, Analytics
- Vertical Spacing: Separate parallel components in the same column by at least 130px to 160px (e.g. y = 100, 260, 420, 580).
- Never overlap node bounding boxes.

4. Edge Connections:
- Connect components with clear communication labels (e.g. "HTTPS", "gRPC", "SQL Queries", "Pub/Sub", "JWT Verification").
- Use sourceHandle="right" and targetHandle="left" for standard left-to-right flows.

OUTPUT FORMAT:
Return ONLY a valid JSON object with the following schema:
{
  "summary": "Brief 1-sentence description of the architecture",
  "actions": [
    // Array of actions (add_node, move_node, resize_node, update_node_data, delete_node, add_edge, delete_edge)
  ]
}

Action Schemas:
- add_node: { "type": "add_node", "id": "node-<name>", "label": "<Label>", "shape": "rectangle" | "diamond" | "circle" | "pill" | "cylinder" | "hexagon", "color": "<fillHex>", "textColor": "<textHex>", "position": { "x": number, "y": number }, "size": { "width": number, "height": number } }
- move_node: { "type": "move_node", "id": "<id>", "position": { "x": number, "y": number } }
- resize_node: { "type": "resize_node", "id": "<id>", "size": { "width": number, "height": number } }
- update_node_data: { "type": "update_node_data", "id": "<id>", "label": "<optional>", "shape": "<optional>", "color": "<optional>", "textColor": "<optional>" }
- delete_node: { "type": "delete_node", "id": "<id>" }
- add_edge: { "type": "add_edge", "id": "e-<source>-<target>", "source": "<sourceId>", "target": "<targetId>", "label": "<protocol>", "sourceHandle": "right", "targetHandle": "left" }
- delete_edge: { "type": "delete_edge", "id": "<id>" }
`

/**
 * Updates AI presence in the Liveblocks room with custom cursor coordinates and thinking state.
 */
async function setAiPresence(
  roomId: string,
  cursor: { x: number; y: number } | null,
  thinking: boolean,
  ttl = 60
): Promise<void> {
  try {
    await liveblocks.setPresence(roomId, {
      userId: "ghost-ai",
      data: {
        cursor,
        thinking,
        isThinking: thinking,
      },
      userInfo: {
        name: "Ghost AI",
        displayName: "Ghost AI",
        color: "#6457F9",
        cursorColor: "#6457F9",
      },
      ttl,
    })
  } catch (err) {
    console.warn("[DesignAgent] Notice: setAiPresence:", err)
  }
}

/**
 * Broadcasts an AI_STATUS event so connected clients see real-time progress.
 */
async function broadcastAiStatus(
  roomId: string,
  status: "start" | "processing" | "complete" | "error",
  message: string,
  summary?: string
): Promise<void> {
  try {
    await liveblocks.broadcastEvent(roomId, {
      type: "AI_STATUS",
      status,
      message,
      summary,
      timestamp: Date.now(),
    })
  } catch (err) {
    console.warn("[DesignAgent] Notice: broadcastAiStatus:", err)
  }

  // Also publish to shared Liveblocks ai-status-feed
  try {
    await liveblocks.createFeedMessage({
      roomId,
      feedId: "ai-status-feed",
      data: {
        status,
        text: message,
        message,
        summary,
        taskType: "design",
        timestamp: Date.now(),
        userId: "ghost-ai",
      },
    })
  } catch {
    // Non-fatal if feed message creation is not configured
  }
}

/**
 * Retrieves existing canvas state (nodes & edges) from Liveblocks room storage.
 */
async function getCurrentCanvasState(roomId: string): Promise<{
  nodes: Record<string, unknown>
  edges: Record<string, unknown>
}> {
  try {
    const doc = (await liveblocks.getStorageDocument(roomId, "json")) as {
      flow?: {
        nodes?: Record<string, unknown>
        edges?: Record<string, unknown>
      }
    }
    return {
      nodes: doc?.flow?.nodes || {},
      edges: doc?.flow?.edges || {},
    }
  } catch (err) {
    console.warn("[DesignAgent] Notice: getCurrentCanvasState:", err)
    return { nodes: {}, edges: {} }
  }
}

/**
 * Normalizes and validates a node shape.
 */
function normalizeShape(shape?: unknown): NodeShape {
  if (typeof shape === "string" && NODE_SHAPES.includes(shape as NodeShape)) {
    return shape as NodeShape
  }
  return "rectangle"
}

/**
 * Normalizes and validates fill and text colors from NODE_COLORS.
 */
function normalizeColors(
  fill?: unknown,
  text?: unknown,
  shape?: NodeShape
): { fill: string; text: string } {
  // If fill matches an exact key in NODE_COLORS
  if (typeof fill === "string") {
    const clean = fill.trim().toLowerCase()
    for (const colorPair of Object.values(NODE_COLORS)) {
      if (colorPair.fill.toLowerCase() === clean) {
        return { fill: colorPair.fill, text: colorPair.text }
      }
    }
    // Check color name keywords
    if (clean.includes("blue")) return { fill: NODE_COLORS.blue.fill, text: NODE_COLORS.blue.text }
    if (clean.includes("purple")) return { fill: NODE_COLORS.purple.fill, text: NODE_COLORS.purple.text }
    if (clean.includes("orange")) return { fill: NODE_COLORS.orange.fill, text: NODE_COLORS.orange.text }
    if (clean.includes("red")) return { fill: NODE_COLORS.red.fill, text: NODE_COLORS.red.text }
    if (clean.includes("pink")) return { fill: NODE_COLORS.pink.fill, text: NODE_COLORS.pink.text }
    if (clean.includes("green")) return { fill: NODE_COLORS.green.fill, text: NODE_COLORS.green.text }
    if (clean.includes("teal")) return { fill: NODE_COLORS.teal.fill, text: NODE_COLORS.teal.text }
  }

  // Sensible default colors by shape role
  if (shape === "cylinder") return { fill: NODE_COLORS.green.fill, text: NODE_COLORS.green.text }
  if (shape === "diamond") return { fill: NODE_COLORS.blue.fill, text: NODE_COLORS.blue.text }
  if (shape === "pill") return { fill: NODE_COLORS.purple.fill, text: NODE_COLORS.purple.text }
  if (shape === "hexagon") return { fill: NODE_COLORS.pink.fill, text: NODE_COLORS.pink.text }

  return {
    fill: typeof fill === "string" && fill.startsWith("#") ? fill : DEFAULT_NODE_COLOR,
    text: typeof text === "string" && text.startsWith("#") ? text : DEFAULT_NODE_TEXT_COLOR,
  }
}

/**
 * Extracts and parses clean JSON from model output.
 */
function parseJsonOutput(raw: string): { summary?: string; actions?: DesignAgentAction[] } {
  let cleaned = raw.trim()
  // Remove markdown code fences if wrapped
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "")
  }
  const firstBrace = cleaned.indexOf("{")
  const lastBrace = cleaned.lastIndexOf("}")
  if (firstBrace !== -1 && lastBrace !== -1) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1)
  }
  return JSON.parse(cleaned)
}

/**
 * Executes the full AI design agent logic:
 * 1. Initializes room & sets AI presence.
 * 2. Reads existing canvas state & calls AI provider with context.
 * 3. Applies generated actions (add, move, resize, update, delete) into Liveblocks storage.
 * 4. Animates cursor & publishes progress updates to the shared status feed.
 * 5. Cleans up AI presence on completion or error.
 */
export async function executeDesignAgent(
  payload: DesignTaskPayload
): Promise<DesignAgentResult> {
  const { prompt, roomId, projectId } = payload

  // 1. Ensure room exists on Liveblocks
  try {
    await liveblocks.getOrCreateRoom(roomId, {
      defaultAccesses: ["room:write"],
    })
  } catch (err) {
    console.warn("[DesignAgent] Notice: getOrCreateRoom:", err)
  }

  // 2. Set initial AI presence & broadcast start status
  await setAiPresence(roomId, { x: 300, y: 150 }, true, 60)
  await broadcastAiStatus(
    roomId,
    "start",
    "Ghost AI started analyzing your architecture request..."
  )

  try {
    // 3. Inspect existing canvas state
    const currentCanvas = await getCurrentCanvasState(roomId)
    const existingNodeKeys = Object.keys(currentCanvas.nodes)
    const existingEdgeKeys = Object.keys(currentCanvas.edges)

    const contextPrompt = `
User Prompt: "${prompt}"

Current Canvas State:
- Existing Nodes (${existingNodeKeys.length}): ${
      existingNodeKeys.length > 0
        ? JSON.stringify(
            Object.values(currentCanvas.nodes).map((n: unknown) => {
              const node = n as { id?: string; data?: { label?: string; shape?: string }; position?: unknown }
              return { id: node.id, label: node.data?.label, shape: node.data?.shape, position: node.position }
            })
          )
        : "None (Canvas is empty)"
    }
- Existing Edges (${existingEdgeKeys.length}): ${
      existingEdgeKeys.length > 0
        ? JSON.stringify(
            Object.values(currentCanvas.edges).map((e: unknown) => {
              const edge = e as { id?: string; source?: string; target?: string; label?: string }
              return { id: edge.id, source: edge.source, target: edge.target, label: edge.label }
            })
          )
        : "None"
    }

Generate the appropriate actions (add, move, resize, update, delete) to fulfill the user's design request.
`

    // 4. Update status to processing
    await broadcastAiStatus(
      roomId,
      "processing",
      "Designing system topology and component dependencies..."
    )

    // 5. Invoke AI model with fallback
    let aiResponseText = ""

    const geminiKey = (
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
      ""
    ).trim()
    const hasGeminiKey =
      geminiKey.length > 0 &&
      geminiKey !== "undefined" &&
      geminiKey !== "null"

    const openrouterKey = (process.env.OPENROUTER_API_KEY || "").trim()
    const hasOpenrouterKey =
      openrouterKey.length > 0 &&
      openrouterKey !== "undefined" &&
      openrouterKey !== "null"

    let lastModelError: unknown = null

    // 5a. Try Google Gemini if key is provided
    if (hasGeminiKey) {
      const google = createGoogleGenerativeAI({
        apiKey: geminiKey,
      })

      const geminiCandidateModels = [
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-1.5-flash",
      ]

      for (const modelId of geminiCandidateModels) {
        try {
          const response = await generateText({
            model: google(modelId),
            system: SYSTEM_PROMPT,
            prompt: contextPrompt,
          })
          aiResponseText = response.text
          if (aiResponseText) break
        } catch (gErr) {
          console.warn(`[DesignAgent] Google model ${modelId} failed:`, gErr)
          lastModelError = gErr
        }
      }
    }

    // 5b. Fall back to OpenRouter if Gemini failed or is unconfigured
    if (!aiResponseText && hasOpenrouterKey) {
      const openrouter = createOpenRouter({
        apiKey: openrouterKey,
      })
      const userSelectedModel = process.env.OPENROUTER_MODEL?.trim()

      const candidateModels = [
        ...(userSelectedModel ? [userSelectedModel] : []),
        "google/gemini-2.0-flash-001",
        "google/gemini-2.5-flash-lite",
        "openai/gpt-4o-mini",
        "meta-llama/llama-3.3-70b-instruct:free",
        "google/gemini-2.0-flash-lite-preview-02-05:free",
        "nvidia/nemotron-3.5-lightning:free"

      ]

      for (const modelName of candidateModels) {
        try {
          const response = await generateText({
            model: openrouter(modelName),
            system: SYSTEM_PROMPT,
            prompt: contextPrompt,
          })
          aiResponseText = response.text
          if (aiResponseText) break
        } catch (orErr) {
          console.warn(
            `[DesignAgent] OpenRouter candidate model ${modelName} failed:`,
            orErr
          )
          lastModelError = orErr
        }
      }
    }

    if (!aiResponseText) {
      if (!hasGeminiKey && !hasOpenrouterKey) {
        throw new Error(
          "No AI API key found. Please set GEMINI_API_KEY (or GOOGLE_GENERATIVE_AI_API_KEY) or OPENROUTER_API_KEY in your Trigger.dev and environment settings."
        )
      }
      throw new Error(
        `Failed to generate architecture response with configured AI providers. Last error: ${
          lastModelError instanceof Error
            ? lastModelError.message
            : String(lastModelError)
        }`
      )
    }

    // 6. Parse actions from AI response
    const parsed = parseJsonOutput(aiResponseText)
    const summary = parsed.summary || "System architecture updated"
    const rawActions = Array.isArray(parsed.actions) ? parsed.actions : []

    if (rawActions.length === 0) {
      await broadcastAiStatus(roomId, "complete", summary, summary)
      return {
        success: true,
        prompt,
        roomId,
        projectId,
        summary,
        actionsCount: 0,
      }
    }

    // 7. Update status: applying changes
    await broadcastAiStatus(
      roomId,
      "processing",
      `Placing ${rawActions.filter((a) => a.type === "add_node").length || rawActions.length} components and wiring dependencies on canvas...`
    )

    // 8. Mutate Liveblocks storage collaboratively
    let firstNodePos: { x: number; y: number } | null = null

    await liveblocks.mutateStorage(roomId, ({ root }) => {
      let flow = root.get("flow")

      if (!flow) {
        flow = new LiveObject({
          nodes: new LiveMap(),
          edges: new LiveMap(),
        })
        root.set("flow", flow)
      }

      let nodesMap = flow.get("nodes")
      if (!nodesMap) {
        nodesMap = new LiveMap()
        flow.set("nodes", nodesMap)
      }

      let edgesMap = flow.get("edges")
      if (!edgesMap) {
        edgesMap = new LiveMap()
        flow.set("edges", edgesMap)
      }

      for (const action of rawActions) {
        if (!action || typeof action !== "object" || !action.type) {
          continue
        }

        switch (action.type) {
          case "add_node": {
            const shape = normalizeShape(action.shape)
            const defaultSize = SHAPE_DEFAULT_SIZES[shape]
            const width = typeof action.size?.width === "number" ? action.size.width : defaultSize.width
            const height = typeof action.size?.height === "number" ? action.size.height : defaultSize.height
            const { fill, text } = normalizeColors(action.color, action.textColor, shape)
            const posX = typeof action.position?.x === "number" ? action.position.x : 200
            const posY = typeof action.position?.y === "number" ? action.position.y : 200

            if (!firstNodePos) {
              firstNodePos = { x: posX, y: posY }
            }

            const nodeId = action.id || `node-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`

            nodesMap.set(
              nodeId,
              new LiveObject({
                id: nodeId,
                type: "canvasNode",
                position: { x: posX, y: posY },
                data: {
                  label: action.label || "Component",
                  shape,
                  color: fill,
                  textColor: text,
                },
                style: {
                  width,
                  height,
                },
                measured: {
                  width,
                  height,
                },
              } as unknown as LsonObject)
            )
            break
          }

          case "move_node": {
            if (action.id && action.position && typeof action.position.x === "number" && typeof action.position.y === "number") {
              const node = nodesMap.get(action.id)
              if (node) {
                const nodeSetter = node as unknown as { set: (key: string, val: unknown) => void }
                nodeSetter.set("position", { x: action.position.x, y: action.position.y })
                if (!firstNodePos) {
                  firstNodePos = { x: action.position.x, y: action.position.y }
                }
              }
            }
            break
          }

          case "resize_node": {
            if (action.id && action.size && typeof action.size.width === "number" && typeof action.size.height === "number") {
              const node = nodesMap.get(action.id)
              if (node) {
                const nodeSetter = node as unknown as { set: (key: string, val: unknown) => void }
                nodeSetter.set("style", { width: action.size.width, height: action.size.height })
                nodeSetter.set("measured", { width: action.size.width, height: action.size.height })
              }
            }
            break
          }

          case "update_node_data": {
            if (action.id) {
              const node = nodesMap.get(action.id)
              if (node) {
                const currentData = ((node.get("data") as unknown) || {}) as Record<string, unknown>
                const shape = action.shape ? normalizeShape(action.shape) : ((currentData.shape as NodeShape) || "rectangle")
                const { fill, text } = normalizeColors(action.color || currentData.color, action.textColor || currentData.textColor, shape)

                const nodeSetter = node as unknown as { set: (key: string, val: unknown) => void }
                nodeSetter.set("data", {
                  ...currentData,
                  ...(action.label !== undefined ? { label: action.label } : {}),
                  ...(action.shape !== undefined ? { shape } : {}),
                  color: fill,
                  textColor: text,
                })
              }
            }
            break
          }

          case "delete_node": {
            if (action.id) {
              nodesMap.delete(action.id)
              // Clean up connected edges
              for (const [edgeId, edgeObj] of edgesMap.entries()) {
                const rawEdge = (edgeObj as unknown as { toImmutable?: () => Record<string, unknown> }).toImmutable?.() || (edgeObj as unknown as Record<string, unknown>)
                if (rawEdge.source === action.id || rawEdge.target === action.id) {
                  edgesMap.delete(edgeId)
                }
              }
            }
            break
          }

          case "add_edge": {
            if (action.id && action.source && action.target) {
              edgesMap.set(
                action.id,
                new LiveObject({
                  id: action.id,
                  type: "canvasEdge",
                  source: action.source,
                  target: action.target,
                  sourceHandle: action.sourceHandle || "right",
                  targetHandle: action.targetHandle || "left",
                  data: {
                    label: action.label || "",
                  },
                  label: action.label || "",
                } as unknown as LsonObject)
              )
            }
            break
          }

          case "delete_edge": {
            if (action.id) {
              edgesMap.delete(action.id)
            }
            break
          }
        }
      }
    })

    // 9. Move AI cursor to the updated area on canvas
    if (firstNodePos) {
      await setAiPresence(roomId, { x: (firstNodePos as { x: number; y: number }).x + 50, y: (firstNodePos as { x: number; y: number }).y + 35 }, true, 30)
    }

    // 10. Broadcast complete status
    await broadcastAiStatus(roomId, "complete", `Architecture generated: ${summary}`, summary)

    return {
      success: true,
      prompt,
      roomId,
      projectId,
      summary,
      actionsCount: rawActions.length,
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error("[DesignAgent] Execution failure:", error)
    await broadcastAiStatus(roomId, "error", `Failed to generate architecture: ${errorMsg}`)
    return {
      success: false,
      prompt,
      roomId,
      projectId,
      error: errorMsg,
    }
  } finally {
    // 11. Always clear AI presence cleanly after finishing
    await setAiPresence(roomId, null, false, 2)
  }
}

/**
 * Trigger.dev designTask background task definition.
 */
export const designTask = task({
  id: "design-agent",
  run: async (payload: DesignTaskPayload) => {
    return await executeDesignAgent(payload)
  },
})

export default designTask
