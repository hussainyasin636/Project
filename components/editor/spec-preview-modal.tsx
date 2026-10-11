"use client"

import React, { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FileText, Download, Loader2, AlertCircle, X } from "lucide-react"
import { cn } from "cn"

export interface SpecItem {
  id: string
  projectId: string
  filePath: string
  createdAt: string | Date
}

interface SpecPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  spec: SpecItem | null
  projectName?: string
}

/**
 * Derives a human-readable filename from a spec object.
 */
export function getSpecFilename(spec: SpecItem, projectName?: string): string {
  if (spec.filePath) {
    const rawName = spec.filePath.split("/").pop()
    if (rawName && !rawName.startsWith("local:")) {
      return rawName
    }
  }

  const cleanProject = projectName
    ? projectName.toLowerCase().replace(/[^a-z0-9_-]/g, "-").replace(/-+/g, "-")
    : "project"

  return `${cleanProject}-spec-${spec.id.slice(0, 8)}.md`
}

/**
 * Triggers a browser download for a spec by invoking its download endpoint.
 */
export function downloadSpecFile(projectId: string, specId: string) {
  const url = `/api/projects/${projectId}/specs/${specId}/download`
  const a = document.createElement("a")
  a.href = url
  a.download = ""
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

/**
 * Lightweight, semantic Markdown renderer for architecture technical specs.
 */
function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split("\n")
  const elements: React.ReactNode[] = []
  let inCodeBlock = false
  let codeBuffer: string[] = []
  let codeLang = ""

  let listBuffer: string[] = []

  const flushList = (key: string) => {
    if (listBuffer.length > 0) {
      elements.push(
        <ul key={`list-${key}`} className="list-disc pl-5 my-2 space-y-1 text-xs text-text-secondary">
          {listBuffer.map((item, idx) => (
            <li key={`li-${idx}`} className="leading-relaxed">
              {formatInlineStyles(item)}
            </li>
          ))}
        </ul>
      )
      listBuffer = []
    }
  }

  const formatInlineStyles = (text: string): React.ReactNode => {
    // Regex for inline code: `code`
    const parts = text.split(/(`[^`]+`)/g)
    return parts.map((part, i) => {
      if (part.startsWith("`") && part.endsWith("`") && part.length > 1) {
        return (
          <code
            key={i}
            className="px-1.5 py-0.5 rounded bg-bg-base border border-border-default text-[11px] font-mono text-accent-ai-text"
          >
            {part.slice(1, -1)}
          </code>
        )
      }

      // Handle bold **text**
      const boldParts = part.split(/(\*\*[^*]+\*\*)/g)
      return boldParts.map((bPart, j) => {
        if (bPart.startsWith("**") && bPart.endsWith("**") && bPart.length > 3) {
          return (
            <strong key={`${i}-${j}`} className="font-semibold text-text-primary">
              {bPart.slice(2, -2)}
            </strong>
          )
        }
        return bPart
      })
    })
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Handle code fences
    if (line.trim().startsWith("```")) {
      flushList(`pre-code-${i}`)
      if (inCodeBlock) {
        // End code block
        elements.push(
          <div
            key={`code-${i}`}
            className="my-3 p-3.5 rounded-lg bg-bg-base border border-border-default overflow-x-auto text-[11px] font-mono leading-relaxed text-[#62C073]"
          >
            {codeLang && (
              <div className="text-[10px] uppercase tracking-wider text-text-faint pb-1 mb-2 border-b border-border-subtle/40 select-none">
                {codeLang}
              </div>
            )}
            <pre className="whitespace-pre">{codeBuffer.join("\n")}</pre>
          </div>
        )
        codeBuffer = []
        codeLang = ""
        inCodeBlock = false
      } else {
        // Start code block
        inCodeBlock = true
        codeLang = line.trim().slice(3).trim()
      }
      continue
    }

    if (inCodeBlock) {
      codeBuffer.push(line)
      continue
    }

    // List items
    if (/^\s*[-*]\s+/.test(line)) {
      listBuffer.push(line.replace(/^\s*[-*]\s+/, ""))
      continue
    } else {
      flushList(`line-${i}`)
    }

    const trimmed = line.trim()

    if (!trimmed) {
      continue
    }

    // Headers
    if (trimmed.startsWith("# ")) {
      elements.push(
        <h1
          key={`h1-${i}`}
          className="text-base font-bold text-text-primary border-b border-border-default pb-2.5 mt-5 mb-3 first:mt-1 font-heading"
        >
          {formatInlineStyles(trimmed.slice(2))}
        </h1>
      )
    } else if (trimmed.startsWith("## ")) {
      elements.push(
        <h2
          key={`h2-${i}`}
          className="text-sm font-semibold text-accent-primary mt-4 mb-2 font-heading"
        >
          {formatInlineStyles(trimmed.slice(3))}
        </h2>
      )
    } else if (trimmed.startsWith("### ")) {
      elements.push(
        <h3
          key={`h3-${i}`}
          className="text-xs font-semibold text-text-primary mt-3.5 mb-1.5"
        >
          {formatInlineStyles(trimmed.slice(4))}
        </h3>
      )
    } else if (trimmed.startsWith("#### ")) {
      elements.push(
        <h4
          key={`h4-${i}`}
          className="text-xs font-medium text-text-secondary mt-2 mb-1"
        >
          {formatInlineStyles(trimmed.slice(5))}
        </h4>
      )
    } else if (trimmed.startsWith("---") || trimmed === "***") {
      elements.push(
        <hr key={`hr-${i}`} className="my-4 border-t border-border-default" />
      )
    } else if (trimmed.startsWith("> ")) {
      elements.push(
        <blockquote
          key={`quote-${i}`}
          className="border-l-2 border-accent-ai pl-3 py-1 my-2 text-xs italic text-text-muted bg-bg-elevated/40 rounded-r"
        >
          {formatInlineStyles(trimmed.slice(2))}
        </blockquote>
      )
    } else {
      elements.push(
        <p key={`p-${i}`} className="text-xs text-text-secondary leading-relaxed mb-2.5">
          {formatInlineStyles(trimmed)}
        </p>
      )
    }
  }

  flushList("final")

  return <div className="space-y-0.5">{elements}</div>
}

/**
 * Modal to preview and download generated technical specifications.
 */
export function SpecPreviewModal({
  isOpen,
  onClose,
  spec,
  projectName,
}: SpecPreviewModalProps) {
  const [content, setContent] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isLoading = Boolean(isOpen && spec && content === null && error === null)

  useEffect(() => {
    if (!isOpen || !spec) return

    let isMounted = true

    // Fetch spec content through download endpoint (never expose blob URL directly to client)
    fetch(`/api/projects/${spec.projectId}/specs/${spec.id}/download`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Failed to load spec content: ${res.statusText}`)
        }
        return res.text()
      })
      .then((text) => {
        if (isMounted) {
          setContent(text)
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error("[SpecPreviewModal] Error fetching spec:", err)
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load specification content."
          )
        }
      })

    return () => {
      isMounted = false
      setContent(null)
      setError(null)
    }
  }, [isOpen, spec])

  if (!spec) return null

  const filename = getSpecFilename(spec, projectName)
  const formattedDate = new Date(spec.createdAt).toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

  const handleDownload = () => {
    downloadSpecFile(spec.projectId, spec.id)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "max-w-2xl w-[92vw] h-[85vh] max-h-[800px] flex flex-col p-0 gap-0",
          "bg-bg-surface border border-border-default shadow-2xl rounded-2xl overflow-hidden"
        )}
      >
        {/* Header */}
        <DialogHeader className="flex flex-row items-center justify-between border-b border-border-default px-5 py-3.5 shrink-0 bg-bg-surface">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border-default bg-bg-elevated text-accent-ai shadow-sm">
              <FileText className="h-4 w-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <DialogTitle className="text-sm font-semibold text-text-primary truncate">
                {filename}
              </DialogTitle>
              <DialogDescription className="text-[11px] text-text-muted truncate mt-0.5">
                Generated {formattedDate}
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownload}
              className={cn(
                "h-8 px-2.5 gap-1.5 text-xs font-medium cursor-pointer rounded-lg transition-all",
                "border-border-default bg-bg-elevated hover:bg-bg-subtle text-text-primary hover:text-white"
              )}
            >
              <Download className="h-3.5 w-3.5 text-accent-primary" />
              <span>Download</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Close specification preview"
              className="h-8 w-8 text-text-secondary hover:text-text-primary hover:bg-bg-subtle rounded-lg"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Modal Body */}
        <div className="flex-1 min-h-0 bg-bg-base/60">
          {isLoading && (
            <div className="flex h-full flex-col items-center justify-center gap-2.5 text-text-muted py-12">
              <Loader2 className="h-6 w-6 animate-spin text-accent-ai" />
              <span className="text-xs">Loading specification...</span>
            </div>
          )}

          {error && (
            <div className="flex h-full flex-col items-center justify-center p-6 text-center">
              <AlertCircle className="h-8 w-8 text-state-error mb-2" />
              <h4 className="text-sm font-medium text-text-primary mb-1">
                Unable to Load Specification
              </h4>
              <p className="text-xs text-text-muted max-w-sm mb-4">
                {error}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setError(null)
                  setContent(null)
                  fetch(`/api/projects/${spec.projectId}/specs/${spec.id}/download`)
                    .then((r) => {
                      if (!r.ok) throw new Error(`HTTP ${r.status}`)
                      return r.text()
                    })
                    .then((t) => {
                      setContent(t)
                    })
                    .catch((e) => {
                      setError(e instanceof Error ? e.message : String(e))
                    })
                }}
                className="h-7 px-3 text-xs"
              >
                Retry
              </Button>
            </div>
          )}

          {!isLoading && !error && content && (
            <ScrollArea className="h-full p-6">
              <div className="max-w-prose mx-auto pb-8">
                <MarkdownRenderer content={content} />
              </div>
            </ScrollArea>
          )}

          {!isLoading && !error && !content && (
            <div className="flex h-full items-center justify-center text-xs text-text-muted">
              Specification content is empty.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
