import { task, metadata, logger } from "@trigger.dev/sdk"
import { generateText } from "ai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import { liveblocks } from "@/lib/liveblocks"
import { saveProjectSpec } from "@/lib/spec-storage"
import { z } from "zod"

/**
 * Zod schema for the generate-spec task payload.
 */
export const generateSpecPayloadSchema = z.object({
  projectId: z.string().min(1, "projectId is required"),
  roomId: z.string().min(1, "roomId is required"),
  chatHistory: z.array(z.unknown()).optional().default([]),
  nodes: z.array(z.unknown()).optional().default([]),
  edges: z.array(z.unknown()).optional().default([]),
})

export type GenerateSpecPayload = z.infer<typeof generateSpecPayloadSchema>

const SPEC_SYSTEM_PROMPT = `You are Ghost AI, a principal systems architect.
Your task is to analyze the provided system architecture diagram (nodes and edges) along with collaborative chat history, and generate a comprehensive, production-grade technical specification in standard Markdown.

Structure the specification with the following sections:
# System Architecture Technical Specification

## 1. Executive Summary
- High-level overview of the system, its primary goals, and target operational requirements.

## 2. System Architecture & Topology
- Architectural pattern (e.g. Microservices, Event-Driven, Serverless, CQRS, etc.).
- Component breakdown based on the canvas nodes (compute services, data stores, API gateways, workers, external integrations).

## 3. Component Details & Responsibilities
- For each node:
  - Name and role
  - Classification (Compute, Database, Ingress/Gateway, Queue, External Service, etc.)
  - Key responsibilities and state requirements

## 4. Communication & Data Flow
- Description of the interactions and edges between components.
- Ingress path, inter-service communication (REST, gRPC, WebSocket), event pub/sub.
- Data persistence and caching flows.

## 5. Non-Functional Requirements & Invariants
- Security & Authentication (boundary controls, token verification).
- Scalability & High Availability.
- Observability (metrics, logging, tracing).
- Fault Tolerance & Disaster Recovery.

Generate clear, well-formatted, professional Markdown without enclosing markdown backtick code blocks around the entire document. Output raw Markdown directly.`

/**
 * Broadcasts AI spec generation status to Liveblocks `ai-status-feed`.
 */
async function broadcastSpecStatus(
  roomId: string,
  status: "start" | "thinking" | "processing" | "complete" | "error",
  message: string,
  summary?: string
): Promise<void> {
  try {
    await liveblocks.createFeedMessage({
      roomId,
      feedId: "ai-status-feed",
      data: {
        status,
        text: message,
        message,
        summary,
        taskType: "spec",
        timestamp: Date.now(),
        userId: "ghost-ai",
      },
    })
  } catch (err) {
    // Non-fatal if feed message creation fails
    logger.warn("[GenerateSpec] Notice: createFeedMessage failed:", { error: String(err) })
  }
}

/**
 * Normalizes input nodes, edges, and chat history into a structured prompt context.
 */
function buildContextPrompt({
  chatHistory,
  nodes,
  edges,
}: {
  chatHistory: unknown[]
  nodes: unknown[]
  edges: unknown[]
}): string {
  const formattedNodes = nodes.map((n) => {
    if (typeof n !== "object" || !n) return n
    const node = n as Record<string, unknown>
    const data = (node.data || {}) as Record<string, unknown>
    return {
      id: node.id,
      label: data.label || node.label || "Unnamed Component",
      shape: data.shape || node.shape || "rectangle",
      color: data.color || node.color,
      position: node.position,
    }
  })

  const formattedEdges = edges.map((e) => {
    if (typeof e !== "object" || !e) return e
    const edge = e as Record<string, unknown>
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label || (edge.data as Record<string, unknown>)?.label,
    }
  })

  const formattedChat = chatHistory.map((c) => {
    if (typeof c === "string") return c
    if (typeof c === "object" && c) {
      const msg = c as Record<string, unknown>
      const sender =
        typeof msg.sender === "object" && msg.sender
          ? (msg.sender as Record<string, unknown>).name
          : msg.sender
      return `[${msg.role || "user"}] ${sender ? `${sender}: ` : ""}${
        msg.content || msg.text || ""
      }`
    }
    return JSON.stringify(c)
  })

  return `
Architecture Graph Context:
- Components / Nodes (${formattedNodes.length}):
${JSON.stringify(formattedNodes, null, 2)}

- Edges / Data Flows (${formattedEdges.length}):
${JSON.stringify(formattedEdges, null, 2)}

Collaborative Discussion & History:
${formattedChat.length > 0 ? formattedChat.join("\n") : "No previous chat history provided."}

Please synthesize the above architecture diagram and requirements into a complete technical specification in Markdown.
`
}

/**
 * Strips accidental wrapping ```markdown ... ``` fences from AI output.
 */
function cleanMarkdownOutput(rawText: string): string {
  let text = rawText.trim()
  if (text.startsWith("```markdown")) {
    text = text.slice("```markdown".length).trim()
  } else if (text.startsWith("```md")) {
    text = text.slice("```md".length).trim()
  } else if (text.startsWith("```")) {
    text = text.slice("```".length).trim()
  }

  if (text.endsWith("```")) {
    text = text.slice(0, -3).trim()
  }

  return text
}

/**
 * Core implementation of AI spec generation.
 */
export async function executeGenerateSpec(
  rawPayload: GenerateSpecPayload
): Promise<string> {
  const validated = generateSpecPayloadSchema.parse(rawPayload)
  const { projectId, roomId, chatHistory } = validated
  let { nodes, edges } = validated

  logger.info("[GenerateSpec] Starting spec generation", { projectId, roomId })

  // 1. Update run metadata & status for realtime tracking
  try {
    metadata.set("status", "analyzing")
    metadata.set("message", "Analyzing system architecture and component dependencies...")
  } catch {
    // Non-fatal if metadata context is unavailable
  }

  await broadcastSpecStatus(
    roomId,
    "start",
    "Ghost AI started analyzing your architecture to generate a technical specification..."
  )

  // 2. Fall back to room storage if nodes or edges are empty
  if (nodes.length === 0 && edges.length === 0 && roomId) {
    try {
      const doc = (await liveblocks.getStorageDocument(roomId, "json")) as {
        flow?: {
          nodes?: Record<string, unknown>
          edges?: Record<string, unknown>
        }
      }
      if (doc?.flow?.nodes) {
        nodes = Object.values(doc.flow.nodes)
      }
      if (doc?.flow?.edges) {
        edges = Object.values(doc.flow.edges)
      }
      logger.info("[GenerateSpec] Retrieved canvas state from room storage", {
        nodeCount: nodes.length,
        edgeCount: edges.length,
      })
    } catch (err) {
      logger.warn("[GenerateSpec] Could not fetch fallback room storage:", {
        error: String(err),
      })
    }
  }

  const contextPrompt = buildContextPrompt({
    chatHistory,
    nodes,
    edges,
  })

  // 3. Update status to generating
  try {
    metadata.set("status", "generating")
    metadata.set("message", "Synthesizing Markdown specification with AI...")
  } catch {
    // Non-fatal
  }

  await broadcastSpecStatus(
    roomId,
    "processing",
    "Drafting technical specification and requirements in Markdown..."
  )

  // 4. Invoke AI model with fallback
  let generatedSpec = ""

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

  // 4a. Try Google Gemini directly
  if (hasGeminiKey) {
    const google = createGoogleGenerativeAI({
      apiKey: geminiKey,
    })

    const candidateModels = [
      "gemini-2.5-flash",
      "gemini-2.0-flash",
      "gemini-1.5-flash",
    ]

    for (const modelId of candidateModels) {
      try {
        const response = await generateText({
          model: google(modelId),
          system: SPEC_SYSTEM_PROMPT,
          prompt: contextPrompt,
        })
        generatedSpec = cleanMarkdownOutput(response.text)
        if (generatedSpec) break
      } catch (gErr) {
        logger.warn(`[GenerateSpec] Google model ${modelId} failed:`, {
          error: String(gErr),
        })
        lastModelError = gErr
      }
    }
  }

  // 4b. Fall back to OpenRouter if Gemini failed or unconfigured
  if (!generatedSpec && hasOpenrouterKey) {
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
    ]

    for (const modelName of candidateModels) {
      try {
        const response = await generateText({
          model: openrouter(modelName),
          system: SPEC_SYSTEM_PROMPT,
          prompt: contextPrompt,
        })
        generatedSpec = cleanMarkdownOutput(response.text)
        if (generatedSpec) break
      } catch (orErr) {
        logger.warn(`[GenerateSpec] OpenRouter model ${modelName} failed:`, {
          error: String(orErr),
        })
        lastModelError = orErr
      }
    }
  }

  if (!generatedSpec) {
    const errorMessage = !hasGeminiKey && !hasOpenrouterKey
      ? "No AI API key found. Please set GEMINI_API_KEY (or GOOGLE_GENERATIVE_AI_API_KEY) or OPENROUTER_API_KEY."
      : `Failed to generate specification with configured AI providers. Last error: ${
          lastModelError instanceof Error
            ? lastModelError.message
            : String(lastModelError)
        }`

    try {
      metadata.set("status", "error")
      metadata.set("message", errorMessage)
    } catch {
      // Non-fatal
    }

    await broadcastSpecStatus(
      roomId,
      "error",
      `Failed to generate technical specification: ${errorMessage}`
    )

    throw new Error(errorMessage)
  }

  // 5. Persist generated spec to Vercel Blob and Prisma
  let savedSpecId: string | undefined
  let savedFilePath: string | undefined

  try {
    const savedSpec = await saveProjectSpec(projectId, generatedSpec)
    savedSpecId = savedSpec.id
    savedFilePath = savedSpec.filePath
    logger.info("[GenerateSpec] Successfully persisted spec to Vercel Blob and database", {
      projectId,
      specId: savedSpec.id,
      filePath: savedSpec.filePath,
    })
  } catch (saveErr) {
    logger.error("[GenerateSpec] Failed to persist spec to storage:", {
      error: String(saveErr),
    })
  }

  // 6. Update run metadata & status to complete
  try {
    metadata.set("status", "completed")
    metadata.set("message", "Technical specification generated successfully")
    metadata.set("specLength", generatedSpec.length)
    if (savedSpecId) {
      metadata.set("specId", savedSpecId)
    }
    if (savedFilePath) {
      metadata.set("filePath", savedFilePath)
    }
  } catch {
    // Non-fatal
  }

  await broadcastSpecStatus(
    roomId,
    "complete",
    "Technical specification generated successfully.",
    "Generated Markdown technical specification"
  )

  logger.info("[GenerateSpec] Successfully generated technical specification", {
    projectId,
    roomId,
    charLength: generatedSpec.length,
    specId: savedSpecId,
  })

  // Return plain Markdown as task output
  return generatedSpec
}

/**
 * Trigger.dev generate-spec task definition.
 */
export const generateSpec = task({
  id: "generate-spec",
  retry: {
    maxAttempts: 2,
  },
  run: async (payload: GenerateSpecPayload) => {
    return await executeGenerateSpec(payload)
  },
})

export default generateSpec
