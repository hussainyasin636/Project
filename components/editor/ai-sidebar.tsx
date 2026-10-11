"use client"

import { useState, useRef, useCallback, useEffect, useMemo } from "react"
import {
  Bot,
  X,
  Send,
  FileText,
  Download,
  Sparkles,
  ArrowRight,
  Loader2,
} from "lucide-react"
import {
  useFeedMessages,
  useCreateFeed,
  useCreateFeedMessage,
  useOthers,
  useSelf,
} from "@liveblocks/react"
import { useRealtimeRun } from "@trigger.dev/react-hooks"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { useWorkspace } from "@/hooks/use-workspace"
import {
  validateAiChatMessage,
  validateAiStatusFeedMessage,
  type AiStatusFeedPayload,
} from "@/types/tasks"
import {
  SpecPreviewModal,
  type SpecItem,
  getSpecFilename,
  downloadSpecFile,
} from "./spec-preview-modal"

export interface FormattedChatMessage {
  id: string
  senderName: string
  senderAvatar?: string
  senderColor?: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp: number
  formattedTime: string
  isSelf: boolean
}

export interface AiSidebarProps {
  isOpen: boolean
  onClose: () => void
  className?: string
  roomId?: string
  projectId?: string
}

const STARTER_PROMPTS = [
  "Design an e-commerce backend",
  "Create a chat app architecture",
  "Build a CI/CD pipeline",
] as const

/**
 * Floating AI Workspace chat & specification sidebar.
 * Real-time collaborative chat via Liveblocks `ai-chat` feed.
 * Activity indicators via Liveblocks `ai-status-feed` and presence.
 * Real-time AI design run tracking via Trigger.dev `useRealtimeRun`.
 */
export function AiSidebar({
  isOpen,
  onClose,
  className,
  roomId,
  projectId,
}: AiSidebarProps) {
  const workspace = useWorkspace()
  const activeProjectId = projectId || workspace?.activeProject?.id
  const activeRoomId = roomId || activeProjectId

  const [activeTab, setActiveTab] = useState<string>("architect")
  const [draft, setDraft] = useState("")
  const [activeRunId, setActiveRunId] = useState<string | null>(null)
  const [publicToken, setPublicToken] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [specs, setSpecs] = useState<SpecItem[]>([])
  const [isLoadingSpecs, setIsLoadingSpecs] = useState(false)
  const [selectedSpec, setSelectedSpec] = useState<SpecItem | null>(null)
  const [isGeneratingSpec, setIsGeneratingSpec] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const chatScrollRef = useRef<HTMLDivElement>(null)
  const completedRunRef = useRef<string>("")

  // Fetch project specs from backend
  const fetchSpecs = useCallback(async () => {
    if (!activeProjectId) return
    setIsLoadingSpecs(true)
    try {
      const res = await fetch(`/api/projects/${activeProjectId}/specs`)
      if (res.ok) {
        const data = (await res.json()) as { specs?: SpecItem[] }
        setSpecs(data.specs || [])
      }
    } catch (err) {
      console.warn("[AiSidebar] Failed to load specs:", err)
    } finally {
      setIsLoadingSpecs(false)
    }
  }, [activeProjectId])

  useEffect(() => {
    if (!activeProjectId) return
    let isCancelled = false

    fetch(`/api/projects/${activeProjectId}/specs`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { specs?: SpecItem[] } | null) => {
        if (!isCancelled && data?.specs) {
          setSpecs(data.specs)
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          console.warn("[AiSidebar] Failed to load specs:", err)
        }
      })

    return () => {
      isCancelled = true
    }
  }, [activeProjectId, activeTab])



  // 1. Subscribe to Liveblocks feeds
  // `ai-chat`: collaborative chat messages between room participants
  // `ai-status-feed`: AI presence and progress updates (separate feed)
  const { messages: rawChatMessages } = useFeedMessages("ai-chat")
  const { messages: rawStatusMessages } = useFeedMessages("ai-status-feed")
  const createFeed = useCreateFeed()
  const createFeedMessage = useCreateFeedMessage()
  const self = useSelf()
  const others = useOthers()

  // Ensure both room-scoped feeds exist on mount
  useEffect(() => {
    createFeed("ai-status-feed").catch(() => {})
    createFeed("ai-chat").catch(() => {})
  }, [createFeed])

  // Extract and validate only the single most recent status message from ai-status-feed
  const latestFeedStatus: AiStatusFeedPayload | null = useMemo(() => {
    if (!rawStatusMessages || rawStatusMessages.length === 0) return null
    const sorted = [...rawStatusMessages].sort((a, b) => b.createdAt - a.createdAt)
    for (const msg of sorted) {
      const validated = validateAiStatusFeedMessage(msg.data)
      if (validated) return validated
    }
    return null
  }, [rawStatusMessages])

  // Handle Run Completion / Failure via onComplete and fallback effect
  const handleRunComplete = useCallback(
    (
      completedRun: NonNullable<ReturnType<typeof useRealtimeRun>["run"]>,
      err?: Error
    ) => {
      if (!completedRun?.id) return
      if (completedRunRef.current === completedRun.id) return
      completedRunRef.current = completedRun.id

      if (
        err ||
        completedRun.status === "FAILED" ||
        completedRun.status === "CRASHED" ||
        completedRun.status === "CANCELED" ||
        completedRun.status === "SYSTEM_FAILURE"
      ) {
        const errorMsg =
          err?.message ||
          (completedRun as { error?: { message?: string } })?.error?.message ||
          "Failed to generate architecture due to a background task error."

        createFeedMessage("ai-chat", {
          sender: {
            id: "ghost-ai",
            name: "Ghost AI",
            avatar: "",
            color: "#ff4d4f",
          },
          role: "assistant",
          content: `Error: ${errorMsg}`,
          timestamp: Date.now(),
        }).catch((e) => {
          console.warn("[AiSidebar] Failed to push error message:", e)
        })
      } else if (completedRun.status === "COMPLETED") {
        const summary =
          (completedRun.output as { summary?: string } | undefined)?.summary ||
          latestFeedStatus?.summary ||
          latestFeedStatus?.text ||
          "I've generated the system architecture on the canvas."

        createFeedMessage("ai-chat", {
          sender: {
            id: "ghost-ai",
            name: "Ghost AI",
            avatar: "",
            color: "#62C073",
          },
          role: "assistant",
          content: summary,
          timestamp: Date.now(),
        }).catch((e) => {
          console.warn("[AiSidebar] Failed to push final message:", e)
        })
      }

      setTimeout(() => {
        setActiveRunId(null)
        setPublicToken(null)
        setIsSubmitting(false)
      }, 0)
    },
    [createFeedMessage, latestFeedStatus]
  )

  // 2. Track AI run status in real time using Trigger.dev useRealtimeRun
  const { run, error: runError } = useRealtimeRun(activeRunId ?? undefined, {
    accessToken: publicToken ?? undefined,
    enabled: Boolean(activeRunId && publicToken),
    onComplete: handleRunComplete,
  })

  // While the run is active:
  // - disable the chat input
  // - show a loading state
  const isRunActive = Boolean(
    isSubmitting ||
    (activeRunId &&
      (!run ||
        run.status === "QUEUED" ||
        run.status === "DEQUEUED" ||
        run.status === "EXECUTING" ||
        run.status === "WAITING"))
  )

  // 3. Validate and sort chat messages in chronological order (oldest to newest)
  const chatMessages: FormattedChatMessage[] = useMemo(() => {
    if (!rawChatMessages || rawChatMessages.length === 0) return []
    const sorted = [...rawChatMessages].sort((a, b) => a.createdAt - b.createdAt)
    const list: FormattedChatMessage[] = []

    for (const msg of sorted) {
      const validated = validateAiChatMessage(msg.data)
      if (!validated) continue

      let senderName = "Collaborator"
      let senderAvatar: string | undefined
      let senderColor: string | undefined
      let senderId: string | undefined

      if (typeof validated.sender === "string") {
        senderName = validated.sender
      } else if (validated.sender && typeof validated.sender === "object") {
        senderName = validated.sender.name || "Collaborator"
        senderAvatar = validated.sender.avatar
        senderColor = validated.sender.color
        senderId = validated.sender.id
      }

      const isSelf = Boolean(
        (self?.id && senderId && self.id === senderId) ||
        (self?.info?.name && senderName === self.info.name)
      )

      list.push({
        id: msg.id,
        senderName: isSelf ? "You" : senderName,
        senderAvatar,
        senderColor,
        role: validated.role,
        content: validated.content,
        timestamp: validated.timestamp,
        formattedTime: new Date(validated.timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        isSelf,
      })
    }

    return list
  }, [rawChatMessages, self])

  // Auto-scroll chat area on new messages
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
    }
  }, [chatMessages.length])

  // 5. Check collaborator presence for thinking state
  const hasThinkingCollaborator = others.some(
    (other) => Boolean(other.presence?.thinking || other.presence?.isThinking)
  )

  // Active status text to display in the compact status strip
  const activeStatusText =
    latestFeedStatus?.text ||
    latestFeedStatus?.message ||
    workspace?.aiActivity?.message ||
    "Ghost AI is generating architecture..."

  // Fallback effect in case onComplete didn't fire on terminal status
  useEffect(() => {
    if (!run || !activeRunId) return
    if (completedRunRef.current === run.id) return

    if (
      run.status === "COMPLETED" ||
      run.status === "FAILED" ||
      run.status === "CRASHED" ||
      run.status === "CANCELED" ||
      run.status === "SYSTEM_FAILURE"
    ) {
      handleRunComplete(run)
    }
  }, [run, activeRunId, handleRunComplete])

  // Handle run hook connection errors
  useEffect(() => {
    if (runError && activeRunId) {
      createFeedMessage("ai-chat", {
        sender: {
          id: "ghost-ai",
          name: "Ghost AI",
          avatar: "",
          color: "#ff4d4f",
        },
        role: "assistant",
        content: `Error tracking run: ${runError.message}`,
        timestamp: Date.now(),
      }).catch(() => {})

      const timer = setTimeout(() => {
        setActiveRunId(null)
        setPublicToken(null)
        setIsSubmitting(false)
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [runError, activeRunId, createFeedMessage])

  const adjustTextareaHeight = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    const nextHeight = Math.min(Math.max(el.scrollHeight, 72), 160)
    el.style.height = `${nextHeight}px`
  }, [])

  const handleDraftChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDraft(e.target.value)
    adjustTextareaHeight()
  }

  // 7. Submit prompt from AI sidebar
  const handleSendMessage = async () => {
    const trimmed = draft.trim()
    if (!trimmed || isRunActive) return

    setIsSubmitting(true)

    // A. Push the user message to the `ai-chat` feed
    try {
      await createFeedMessage("ai-chat", {
        sender: {
          id: (self?.id as string) || "",
          name:
            (self?.info?.name as string) ||
            (self?.info?.displayName as string) ||
            "Collaborator",
          avatar:
            (self?.info?.avatar as string) ||
            (self?.info?.avatarUrl as string) ||
            "",
          color: "#62C073",
        },
        role: "user",
        content: trimmed,
        timestamp: Date.now(),
      })
    } catch (feedErr) {
      console.warn("[AiSidebar] Notice: createFeedMessage:", feedErr)
    }

    setDraft("")
    if (textareaRef.current) {
      textareaRef.current.style.height = "72px"
    }

    // B. Call POST /api/ai/design with { prompt, roomId }
    try {
      const res = await fetch("/api/ai/design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: trimmed,
          roomId: activeRoomId,
          projectId: activeProjectId,
        }),
      })

      if (!res.ok) {
        const errorData = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(errorData.error || `Request failed (${res.status})`)
      }

      // C. Read { runId, publicToken } from the response
      const data = (await res.json()) as {
        runId?: string
        publicToken?: string
        token?: string
      }

      if (!data.runId) {
        throw new Error("No runId returned from design API")
      }

      let resolvedToken = data.publicToken || data.token || ""

      // Fallback: fetch public token if not returned directly
      if (!resolvedToken) {
        const tokenRes = await fetch("/api/ai/design/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ runId: data.runId }),
        })
        if (tokenRes.ok) {
          const tokenData = (await tokenRes.json().catch(() => ({}))) as { token?: string }
          resolvedToken = tokenData.token || ""
        }
      }

      // Store runId and publicToken in local state
      setActiveRunId(data.runId)
      setPublicToken(resolvedToken)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to trigger AI design"
      // Show errors as messages in `ai-chat` feed
      await createFeedMessage("ai-chat", {
        sender: {
          id: "ghost-ai",
          name: "Ghost AI",
          avatar: "",
          color: "#ff4d4f",
        },
        role: "assistant",
        content: `Error: ${message}`,
        timestamp: Date.now(),
      }).catch(() => {})

      setIsSubmitting(false)
      setActiveRunId(null)
      setPublicToken(null)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleSelectStarterChip = (chip: string) => {
    setDraft(chip)
    if (textareaRef.current) {
      textareaRef.current.focus()
      setTimeout(adjustTextareaHeight, 0)
    }
  }

  const handleGenerateSpec = async () => {
    if (!activeRoomId || isGeneratingSpec) return
    setIsGeneratingSpec(true)
    try {
      const res = await fetch("/api/ai/spec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: activeRoomId,
          chatHistory: chatMessages.map((m) => ({ role: m.role, content: m.content })),
          nodes: [],
          edges: [],
        }),
      })
      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(errData.error || "Failed to trigger spec generation")
      }
      setTimeout(() => {
        fetchSpecs()
      }, 1500)
    } catch (err) {
      console.error("[AiSidebar] Failed to generate spec:", err)
    } finally {
      setIsGeneratingSpec(false)
    }
  }

  return (
    <aside
      className={cn(
        "fixed right-0 top-12 z-30 flex h-[calc(100vh-3rem)] w-80 flex-col md:w-88",
        "border-l border-border-default bg-bg-surface/95 backdrop-blur-md shadow-2xl",
        "transition-all duration-300 ease-in-out select-none",
        isOpen
          ? "translate-x-0 opacity-100 pointer-events-auto"
          : "translate-x-full opacity-0 pointer-events-none invisible",
        className
      )}
      aria-hidden={!isOpen}
      aria-label="AI Workspace Sidebar"
    >
      {/* 2. Sidebar Header */}
      <div className="flex h-14 items-center justify-between border-b border-border-default px-4 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border-default bg-bg-elevated text-accent-ai shadow-sm">
            <Bot className="h-4 w-4" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-sm font-semibold text-text-primary leading-tight">
                AI Workspace
              </span>
              {(isRunActive || hasThinkingCollaborator) && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#62C073]/15 border border-[#62C073]/30 px-1.5 py-0.5 text-[10px] font-medium text-[#62C073] animate-pulse">
                  <Loader2 className="h-2.5 w-2.5 animate-spin text-[#62C073] shrink-0" />
                  Generating
                </span>
              )}
            </div>
            <span className="truncate text-xs text-text-muted leading-tight">
              Collaborate with Ghost AI
            </span>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Close AI sidebar"
          className="h-8 w-8 shrink-0 text-text-secondary hover:text-text-primary hover:bg-bg-subtle"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* 3. Tabbed Layout */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex flex-1 flex-col overflow-hidden"
      >
        <div className="px-4 pt-3 pb-2 shrink-0">
          <TabsList className="w-full grid grid-cols-2 bg-bg-elevated p-1 rounded-lg border border-border-default h-9">
            <TabsTrigger
              value="architect"
              className={cn(
                "rounded-md text-xs font-medium transition-all",
                "text-text-muted hover:text-text-primary",
                "data-active:bg-accent-ai data-active:text-white data-active:shadow-sm"
              )}
            >
              AI Architect
            </TabsTrigger>
            <TabsTrigger
              value="specs"
              className={cn(
                "rounded-md text-xs font-medium transition-all",
                "text-text-muted hover:text-text-primary",
                "data-active:bg-accent-ai data-active:text-white data-active:shadow-sm"
              )}
            >
              Specs
            </TabsTrigger>
          </TabsList>
        </div>

        {/* 4. AI Architect Tab */}
        <TabsContent
          value="architect"
          className="flex flex-1 flex-col overflow-hidden m-0 p-0 outline-none"
        >
          {/* Scrollable Chat Area */}
          <div
            ref={chatScrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-4"
          >
            {chatMessages.length === 0 ? (
              /* Empty state */
              <div className="flex h-full flex-col items-center justify-center text-center py-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border-default bg-bg-elevated text-accent-ai mb-3 shadow-inner">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-semibold text-text-primary mb-1">
                  AI Architect
                </h3>
                <p className="text-xs text-text-muted max-w-[240px] mb-5 leading-relaxed">
                  Prompt Ghost AI to architect systems, scaffold diagrams, and optimize your cloud topology.
                </p>

                {/* Starter prompt chips */}
                <div className="w-full flex flex-col gap-2">
                  <span className="text-[11px] font-medium text-text-faint text-left pl-1">
                    Suggested prompts
                  </span>
                  {STARTER_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => handleSelectStarterChip(prompt)}
                      className="group flex items-center justify-between rounded-full bg-bg-subtle border border-border-default px-3.5 py-2 text-xs text-accent-ai-text hover:bg-bg-elevated hover:border-accent-ai/40 transition-all text-left cursor-pointer active:scale-95 shadow-sm"
                    >
                      <span className="truncate mr-2">{prompt}</span>
                      <ArrowRight className="h-3 w-3 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Chronological Chat Messages from `ai-chat` feed */
              chatMessages.map((message) => {
                const isUser = message.role === "user"
                const isAssistant = message.role === "assistant"

                return (
                  <div
                    key={message.id}
                    className={cn(
                      "flex flex-col space-y-1",
                      isUser ? "items-end" : "items-start"
                    )}
                  >
                    {/* Sender badge (visible for collaborators & assistant) */}
                    <div className="flex items-center gap-1.5 px-1">
                      {!message.isSelf && (
                        <div className="flex items-center gap-1">
                          {isAssistant && (
                            <Bot className="h-3 w-3 text-accent-ai shrink-0" />
                          )}
                          <span
                            className="text-[11px] font-medium truncate max-w-[120px]"
                            style={{
                              color: message.senderColor || "var(--color-text-muted)",
                            }}
                          >
                            {message.senderName}
                          </span>
                        </div>
                      )}
                      <span className="text-[10px] text-text-faint">
                        {message.formattedTime}
                      </span>
                    </div>

                    {/* Chat Bubble:
                        User: green accent background (#62C073), readable contrast text
                        AI: dark background, light text */}
                    <div
                      className={cn(
                        "rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed select-text",
                        isUser
                          ? "bg-[#62C073] text-[#080809] font-medium rounded-tr-sm max-w-[85%] shadow-sm"
                          : "bg-bg-elevated border border-border-default text-text-primary rounded-tl-sm max-w-[88%] shadow-sm"
                      )}
                    >
                      {message.content}
                    </div>
                  </div>
                )
              })
            )}

            {/* Live AI Thinking / Generation Status */}
            {isRunActive && (
              <div className="flex items-start gap-2 max-w-[90%]">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-[#62C073]/40 bg-bg-elevated text-[#62C073] shadow-sm mt-0.5">
                  <Bot className="h-3.5 w-3.5" />
                </div>
                <div className="rounded-2xl rounded-tl-sm px-3.5 py-2 text-xs bg-bg-elevated border border-[#62C073]/30 text-[#62C073] shadow-sm flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin shrink-0 text-[#62C073]" />
                  <span className="truncate">{activeStatusText}</span>
                </div>
              </div>
            )}
          </div>

          {/* Sticky Input Area */}
          <div className="border-t border-border-default bg-bg-surface p-3 shrink-0">
            {/* Status strip:
                - Compact bar above input
                - Dark base + green accent
                - Shown only when run is active */}
            {isRunActive && (
              <div className="mb-2 flex items-center gap-2 rounded-lg bg-bg-elevated border border-[#62C073]/40 px-2.5 py-1.5 text-xs text-[#62C073] shadow-sm animate-pulse">
                <Loader2 className="h-3 w-3 animate-spin text-[#62C073] shrink-0" />
                <span className="truncate font-medium">{activeStatusText}</span>
              </div>
            )}

            <div className="relative rounded-xl border border-border-default bg-bg-elevated focus-within:border-[#62C073] transition-colors p-2 flex flex-col">
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={handleDraftChange}
                onKeyDown={handleKeyDown}
                disabled={isRunActive}
                placeholder={
                  isRunActive
                    ? "Ghost AI is generating architecture... input disabled"
                    : "Ask Ghost AI to design or modify architecture... (Enter to send)"
                }
                className="w-full min-h-[72px] max-h-[160px] resize-none bg-transparent text-xs text-text-primary placeholder:text-text-muted focus:outline-none leading-relaxed p-1 disabled:opacity-50"
                rows={3}
              />
              <div className="flex items-center justify-between pt-1 border-t border-border-subtle/50 mt-1">
                <span className="text-[10px] text-text-faint">
                  Shift+Enter for newline
                </span>
                {/* Submit button:
                    - Enabled: green accent (#62C073)
                    - Disabled: dimmed state
                    - While running: show spinner */}
                <Button
                  size="sm"
                  onClick={handleSendMessage}
                  disabled={!draft.trim() || isRunActive}
                  className={cn(
                    "h-7 px-3 rounded-lg gap-1.5 text-xs font-semibold cursor-pointer transition-all",
                    "bg-[#62C073] hover:bg-[#52B063] text-[#080809]",
                    "disabled:opacity-40 disabled:cursor-not-allowed"
                  )}
                >
                  {isRunActive ? (
                    <Loader2 className="h-3 w-3 animate-spin text-[#080809]" />
                  ) : (
                    <Send className="h-3 w-3 text-[#080809]" />
                  )}
                  <span>{isRunActive ? "Generating..." : "Send"}</span>
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* 5. Specs Tab */}
        <TabsContent
          value="specs"
          className="flex flex-1 flex-col overflow-y-auto p-4 space-y-3 m-0 outline-none"
        >
          {/* Generate Spec Action */}
          <Button
            onClick={handleGenerateSpec}
            disabled={isGeneratingSpec}
            className={cn(
              "w-full h-9 bg-accent-ai hover:bg-accent-ai/90 text-white rounded-lg gap-2 text-xs font-medium cursor-pointer transition-all shadow-md shrink-0",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {isGeneratingSpec ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            <span>{isGeneratingSpec ? "Generating Spec..." : "Generate Spec"}</span>
          </Button>

          {/* Spec List */}
          <div className="flex-1 flex flex-col gap-2 min-h-0 pt-1">
            {isLoadingSpecs && specs.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-text-muted">
                <Loader2 className="h-5 w-5 animate-spin text-accent-ai mb-2" />
                <span className="text-xs">Loading specifications...</span>
              </div>
            ) : specs.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-6 text-center rounded-xl border border-border-default/60 bg-bg-elevated/40">
                <FileText className="h-8 w-8 text-text-muted/50 mb-2" />
                <h4 className="text-xs font-semibold text-text-primary mb-1">
                  No specifications yet
                </h4>
                <p className="text-[11px] text-text-muted leading-relaxed max-w-[220px]">
                  Generate a technical Markdown specification from your canvas architecture to view and download it here.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {specs.map((spec) => {
                  const filename = getSpecFilename(spec, workspace?.activeProject?.name)
                  const formattedDate = new Date(spec.createdAt).toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })

                  return (
                    <div
                      key={spec.id}
                      onClick={() => setSelectedSpec(spec)}
                      className={cn(
                        "group rounded-xl border border-border-default bg-bg-elevated p-3 flex items-center justify-between gap-2.5",
                        "hover:border-accent-primary/40 hover:bg-bg-subtle/80 cursor-pointer transition-all shadow-sm"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-bg-subtle group-hover:bg-bg-elevated border border-border-subtle text-accent-ai transition-colors">
                          <FileText className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-medium text-text-primary truncate group-hover:text-white transition-colors">
                            {filename}
                          </span>
                          <span className="text-[10px] text-text-muted truncate mt-0.5">
                            {formattedDate}
                          </span>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          downloadSpecFile(spec.projectId, spec.id)
                        }}
                        aria-label={`Download ${filename}`}
                        className="h-7 w-7 shrink-0 text-text-secondary hover:text-text-primary hover:bg-bg-elevated rounded-lg"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Specification Preview & Download Modal */}
      <SpecPreviewModal
        isOpen={Boolean(selectedSpec)}
        onClose={() => setSelectedSpec(null)}
        spec={selectedSpec}
        projectName={workspace?.activeProject?.name}
      />
    </aside>
  )
}
