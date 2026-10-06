import { useEffect } from "react"

export interface ReactFlowZoomInstance {
  zoomIn: (options?: { duration?: number }) => void | Promise<unknown>
  zoomOut: (options?: { duration?: number }) => void | Promise<unknown>
  fitView?: (options?: { duration?: number }) => void | Promise<unknown>
}

export interface UseKeyboardShortcutsOptions {
  reactFlow?: ReactFlowZoomInstance
  undo?: () => void
  redo?: () => void
}

/**
 * Checks if an event target is an editable element where canvas keyboard shortcuts should be ignored.
 */
function isEditableElement(element: EventTarget | null): boolean {
  if (!element || !(element instanceof HTMLElement)) {
    return false
  }

  const tagName = element.tagName.toLowerCase()
  if (
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select"
  ) {
    return true
  }

  if (element.isContentEditable) {
    return true
  }

  if (element.closest?.("input, textarea, select, [contenteditable='true'], [role='textbox']")) {
    return true
  }

  return false
}

/**
 * Hook to handle canvas keyboard shortcuts:
 * - Zoom in: `+` or `=`
 * - Zoom out: `-`
 * - Undo: `Cmd/Ctrl + Z`
 * - Redo: `Cmd/Ctrl + Shift + Z` or `Cmd/Ctrl + Y`
 *
 * Ignores shortcuts while typing in inputs, textareas, or editable text fields.
 */
export function useKeyboardShortcuts(
  optionsOrInstance: ReactFlowZoomInstance | UseKeyboardShortcutsOptions,
  handlersOrUndo?:
    | (() => void)
    | {
        undo?: () => void
        redo?: () => void
      },
  redoHandler?: () => void
) {
  let resolvedReactFlow: ReactFlowZoomInstance | undefined
  let resolvedUndo: (() => void) | undefined
  let resolvedRedo: (() => void) | undefined

  if (typeof handlersOrUndo === "function") {
    // Called as: useKeyboardShortcuts(reactFlowInstance, undoFn, redoFn)
    resolvedReactFlow = optionsOrInstance as ReactFlowZoomInstance
    resolvedUndo = handlersOrUndo
    resolvedRedo = redoHandler
  } else if (handlersOrUndo && typeof handlersOrUndo === "object") {
    // Called as: useKeyboardShortcuts(reactFlowInstance, { undo, redo })
    resolvedReactFlow = optionsOrInstance as ReactFlowZoomInstance
    resolvedUndo = handlersOrUndo.undo
    resolvedRedo = handlersOrUndo.redo
  } else if (optionsOrInstance && typeof optionsOrInstance === "object") {
    // Called as: useKeyboardShortcuts({ reactFlow, undo, redo }) or useKeyboardShortcuts(reactFlowInstance)
    if ("reactFlow" in optionsOrInstance || "undo" in optionsOrInstance || "redo" in optionsOrInstance) {
      const opts = optionsOrInstance as UseKeyboardShortcutsOptions
      resolvedReactFlow = opts.reactFlow
      resolvedUndo = opts.undo
      resolvedRedo = opts.redo
    } else {
      resolvedReactFlow = optionsOrInstance as ReactFlowZoomInstance
    }
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore shortcuts when focus is inside editable form controls or contenteditable elements
      if (isEditableElement(event.target)) {
        return
      }

      const isCtrlOrCmd = event.ctrlKey || event.metaKey

      // Redo: Cmd/Ctrl + Shift + Z OR Cmd/Ctrl + Y
      if (
        (isCtrlOrCmd && event.shiftKey && (event.key === "z" || event.key === "Z")) ||
        (isCtrlOrCmd && !event.shiftKey && (event.key === "y" || event.key === "Y"))
      ) {
        if (resolvedRedo) {
          event.preventDefault()
          resolvedRedo()
        }
        return
      }

      // Undo: Cmd/Ctrl + Z (without Shift)
      if (isCtrlOrCmd && !event.shiftKey && (event.key === "z" || event.key === "Z")) {
        if (resolvedUndo) {
          event.preventDefault()
          resolvedUndo()
        }
        return
      }

      // Zoom In: `+` or `=` (with or without Ctrl/Cmd, but not Alt)
      if (!event.altKey && (event.key === "+" || event.key === "=")) {
        if (resolvedReactFlow?.zoomIn) {
          event.preventDefault()
          resolvedReactFlow.zoomIn({ duration: 300 })
        }
        return
      }

      // Zoom Out: `-` or `_` (with or without Ctrl/Cmd, but not Alt)
      if (!event.altKey && (event.key === "-" || (isCtrlOrCmd && event.key === "_"))) {
        if (resolvedReactFlow?.zoomOut) {
          event.preventDefault()
          resolvedReactFlow.zoomOut({ duration: 300 })
        }
        return
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [resolvedReactFlow, resolvedUndo, resolvedRedo])
}

export default useKeyboardShortcuts
