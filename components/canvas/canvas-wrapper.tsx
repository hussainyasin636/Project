"use client"

import type { ReactNode } from "react"
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

interface CanvasWrapperProps {
  roomId: string
  children?: ReactNode
}

/**
 * Client-side canvas wrapper that establishes the Liveblocks room connection,
 * configures initial presence, and handles loading and error states.
 */
export function CanvasWrapper({ roomId, children }: CanvasWrapperProps) {
  return (
    <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
      <RoomProvider
        id={roomId}
        initialPresence={{
          cursor: null,
          isThinking: false,
        }}
        initialStorage={{
          flow: new LiveObject({
            nodes: new LiveMap<string, LiveObject<LsonObject>>(),
            edges: new LiveMap<string, LiveObject<LsonObject>>(),
          }),
        }}
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
            {children ?? <Canvas />}
          </ClientSideSuspense>
        </ErrorBoundary>
      </RoomProvider>
    </LiveblocksProvider>
  )
}
