"use client"

import { ReactNode } from "react"
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
