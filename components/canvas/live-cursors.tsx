"use client"

import { useOthers } from "@liveblocks/react/suspense"
import { useViewport } from "@xyflow/react"

/**
 * Renders collaborative live cursors for other participants on the canvas.
 * - Displays a colored pointer matching the participant's presence color
 * - Displays an attached name badge with their display name
 * - Only renders other participants, never the current user
 * - Uses pointer-events-none so cursors never interfere with canvas interactions
 */
export function LiveCursors() {
  const others = useOthers()
  const { x: panX, y: panY, zoom } = useViewport()

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden select-none z-30"
      aria-hidden="true"
    >
      {others.map((other) => {
        const cursor = other.presence?.cursor
        if (
          !cursor ||
          typeof cursor.x !== "number" ||
          typeof cursor.y !== "number"
        ) {
          return null
        }

        const name =
          other.info?.name ||
          other.info?.displayName ||
          "Collaborator"
        const color =
          other.info?.color ||
          other.info?.cursorColor ||
          "#00c8d4"

        const screenX = cursor.x * zoom + panX
        const screenY = cursor.y * zoom + panY

        return (
          <div
            key={other.connectionId}
            className="pointer-events-none absolute left-0 top-0 flex items-start"
            style={{
              transform: `translate3d(${screenX}px, ${screenY}px, 0)`,
              transition: "transform 80ms ease-out",
              willChange: "transform",
            }}
          >
            {/* Colored SVG Pointer */}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="drop-shadow-md -translate-x-0.5 -translate-y-0.5"
            >
              <path
                d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
                fill={color}
                stroke="#080809"
                strokeWidth="1.2"
              />
            </svg>

            {/* Attached Name Badge */}
            <div
              className="ml-1.5 mt-2 px-1.5 py-0.5 rounded-md text-[11px] font-medium text-white shadow-md whitespace-nowrap select-none"
              style={{ backgroundColor: color }}
            >
              {name}
            </div>
          </div>
        )
      })}
    </div>
  )
}
