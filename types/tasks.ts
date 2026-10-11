import { z } from "zod"

export type TaskStatus =
  | "idle"
  | "start"
  | "thinking"
  | "processing"
  | "complete"
  | "error"

export type TaskType = "design" | "spec" | "general"

/**
 * Zod schema for Liveblocks `ai-status-feed` message payload.
 * Supports an optional `text` field per Feature 24 specification.
 */
export const aiStatusFeedPayloadSchema = z.object({
  status: z
    .enum(["idle", "start", "thinking", "processing", "complete", "error"])
    .optional()
    .default("processing"),
  text: z.string().optional(),
  message: z.string().optional(),
  summary: z.string().optional(),
  taskType: z
    .enum(["design", "spec", "general"])
    .optional()
    .default("general"),
  timestamp: z.number().optional(),
  userId: z.string().optional(),
})

export type AiStatusFeedPayload = z.infer<typeof aiStatusFeedPayloadSchema>

/**
 * Validates incoming feed messages before displaying them.
 * Returns validated AiStatusFeedPayload or null if validation fails.
 */
export function validateAiStatusFeedMessage(
  data: unknown
): AiStatusFeedPayload | null {
  if (!data || typeof data !== "object") {
    return null
  }

  const result = aiStatusFeedPayloadSchema.safeParse(data)
  if (result.success) {
    return result.data
  }

  // Graceful fallback if payload contains text or message
  const raw = data as Record<string, unknown>
  if (typeof raw.text === "string" && raw.text.trim()) {
    return {
      status: "processing",
      text: raw.text.trim(),
      taskType: "general",
    }
  }

  if (typeof raw.message === "string" && raw.message.trim()) {
    return {
      status: "processing",
      text: raw.message.trim(),
      message: raw.message.trim(),
      taskType: "general",
    }
  }

  return null
}

export type ChatRole = "user" | "assistant" | "system"

/**
 * Zod schema for Liveblocks `ai-chat` feed message payload.
 * Includes sender, role, content, and timestamp per Feature 25 specification.
 */
export const aiChatMessagePayloadSchema = z.object({
  sender: z.union([
    z.string(),
    z.object({
      id: z.string().optional(),
      name: z.string(),
      avatar: z.string().optional(),
      color: z.string().optional(),
    }),
  ]),
  role: z.enum(["user", "assistant", "system"]).default("user"),
  content: z.string().min(1),
  timestamp: z.number().default(() => Date.now()),
})

export type AiChatMessagePayload = z.infer<typeof aiChatMessagePayloadSchema>

/**
 * Validates incoming chat messages from the `ai-chat` feed before rendering them.
 * Returns validated AiChatMessagePayload or null if invalid.
 */
export function validateAiChatMessage(
  data: unknown
): AiChatMessagePayload | null {
  if (!data || typeof data !== "object") {
    return null
  }

  const result = aiChatMessagePayloadSchema.safeParse(data)
  if (result.success) {
    return result.data
  }

  // Graceful fallback if payload contains text content
  const raw = data as Record<string, unknown>
  if (typeof raw.content === "string" && raw.content.trim()) {
    let senderVal: string | { name: string; avatar?: string; color?: string } =
      "Collaborator"
    if (typeof raw.sender === "string" && raw.sender.trim()) {
      senderVal = raw.sender.trim()
    } else if (raw.sender && typeof raw.sender === "object") {
      const s = raw.sender as Record<string, unknown>
      senderVal = {
        name: typeof s.name === "string" ? s.name : "Collaborator",
        avatar: typeof s.avatar === "string" ? s.avatar : undefined,
        color: typeof s.color === "string" ? s.color : undefined,
      }
    }

    return {
      sender: senderVal,
      role:
        raw.role === "assistant" || raw.role === "system"
          ? raw.role
          : "user",
      content: raw.content.trim(),
      timestamp:
        typeof raw.timestamp === "number" ? raw.timestamp : Date.now(),
    }
  }

  return null
}
