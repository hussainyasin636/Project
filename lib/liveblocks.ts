import { Liveblocks } from "@liveblocks/node"

/**
 * Fixed palette of accessible, distinct colors for collaborative user cursors.
 * Harmonized with dark workspace canvas design tokens.
 */
export const CURSOR_PALETTE = [
  "#00C8D4", // Cyan (Brand Accent)
  "#6457F9", // Indigo-Purple (AI Accent)
  "#52A8FF", // Blue
  "#BF7AF0", // Purple
  "#FF990A", // Orange
  "#FF6166", // Red
  "#F75F8F", // Pink
  "#34D399", // Emerald / Green
  "#0AC7B4", // Teal
  "#FBBF24", // Amber
] as const

export const CURSOR_COLORS = CURSOR_PALETTE

/**
 * Deterministically maps a user ID to a consistent color from the fixed CURSOR_PALETTE.
 */
export function getUserColor(userId: string): string {
  if (!userId || typeof userId !== "string") {
    return CURSOR_PALETTE[0]
  }

  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = (hash << 5) - hash + userId.charCodeAt(i)
    hash |= 0 // Convert to 32bit integer
  }

  const index = Math.abs(hash) % CURSOR_PALETTE.length
  return CURSOR_PALETTE[index]
}

// Aliases for flexibility across imports
export const getCursorColor = getUserColor
export const getUserCursorColor = getUserColor

const globalForLiveblocks = globalThis as unknown as {
  liveblocks: Liveblocks | undefined
}

/**
 * Retrieves or creates the cached Liveblocks node client instance.
 * Caches on globalThis in non-production environments to avoid multiple client instances during HMR.
 */
export function getLiveblocksClient(): Liveblocks {
  if (globalForLiveblocks.liveblocks) {
    return globalForLiveblocks.liveblocks
  }

  const secret = process.env.LIVEBLOCKS_SECRET_KEY
  if (!secret && process.env.NODE_ENV !== "production") {
    console.warn(
      "[Liveblocks] LIVEBLOCKS_SECRET_KEY is not defined. Using development fallback key."
    )
  }

  const client = new Liveblocks({
    secret: secret || "sk_dev_placeholder_key_for_liveblocks_initialization",
  })

  if (process.env.NODE_ENV !== "production") {
    globalForLiveblocks.liveblocks = client
  }

  return client
}

/**
 * Cached Liveblocks Node Client singleton.
 */
export const liveblocks = globalForLiveblocks.liveblocks ?? getLiveblocksClient()
