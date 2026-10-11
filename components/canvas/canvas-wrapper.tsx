"use client"

import { memo, type ReactNode } from "react"
import { LiveObject, LiveMap, type LsonObject } from "@liveblocks/client"
import {
  LiveblocksProvider,
  RoomProvider,
  ClientSideSuspense,
} from "@liveblocks/react/suspense"
import { ErrorBoundary } from "react-error-boundary"
import { Canvas } from "@/components/canvas/canvas"
import { CanvasLoading } from "@/components/canvas/canvas-loading"
import { CanvasError } from "@/components/canvas/canvas-error"
import { PresenceSync } from "@/components/editor/presence-sync"

interface CanvasWrapperProps {
  roomId: string
  children?: ReactNode
}

const INITIAL_PRESENCE = {
  cursor: null,
  thinking: false,
  isThinking: false,
}

function getInitialStorage() {
  return {
    flow: new LiveObject({
      nodes: new LiveMap<string, LiveObject<LsonObject>>(),
      edges: new LiveMap<string, LiveObject<LsonObject>>(),
    }),
  }
}

/**
 * Client-side canvas wrapper that establishes the Liveblocks room connection,
 * configures initial presence, and handles loading and error states.
 */
function CanvasWrapperComponent({ roomId, children }: CanvasWrapperProps) {
  return (
    <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
      <RoomProvider
        id={roomId}
        initialPresence={INITIAL_PRESENCE}
        initialStorage={getInitialStorage}
      >
        <ErrorBoundary
          fallbackRender={({ error, resetErrorBoundary }) => (
            <CanvasError
              error={error}
              resetErrorBoundary={resetErrorBoundary}
            />
          )}
        >
          <ClientSideSuspense fallback={<CanvasLoading />}>
            <PresenceSync />
            {children ?? <Canvas projectId={roomId} />}
          </ClientSideSuspense>
        </ErrorBoundary>
      </RoomProvider>
    </LiveblocksProvider>
  )
}

export const CanvasWrapper = memo(CanvasWrapperComponent)
