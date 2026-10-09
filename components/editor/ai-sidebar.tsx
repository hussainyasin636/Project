"use client"

import { useState, useRef, useCallback } from "react"
import {
  Bot,
  X,
  Send,
  FileText,
  Download,
  Sparkles,
  ArrowRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

export interface AiChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: string
}

export interface AiSidebarProps {
  isOpen: boolean
  onClose: () => void
  className?: string
}

const STARTER_PROMPTS = [
  "Design an e-commerce backend",
  "Create a chat app architecture",
  "Build a CI/CD pipeline",
] as const

/**
 * Floating AI Workspace chat & specification sidebar.
 * Sits as an overlay over the canvas, sliding in from the right edge.
 */
export function AiSidebar({ isOpen, onClose, className }: AiSidebarProps) {
  const [activeTab, setActiveTab] = useState<string>("architect")
  const [messages, setMessages] = useState<AiChatMessage[]>([])
  const [draft, setDraft] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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

  const handleSendMessage = () => {
    const trimmed = draft.trim()
    if (!trimmed) return

    const userMsg: AiChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }

    setMessages((prev) => [...prev, userMsg])
    setDraft("")

    if (textareaRef.current) {
      textareaRef.current.style.height = "72px"
    }

    // Demo assistant response for responsive UI feel
    setTimeout(() => {
      const assistantMsg: AiChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: `I've analyzed your request: "${trimmed}". In the next update, I will generate nodes, layout dependencies, and wire edge connections directly to your canvas.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }
      setMessages((prev) => [...prev, assistantMsg])
    }, 600)
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
      // Adjust height if chip text wraps
      setTimeout(adjustTextareaHeight, 0)
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
            <span className="truncate text-sm font-semibold text-text-primary leading-tight">
              AI Workspace
            </span>
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
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
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
              /* Messages list */
              messages.map((message) => {
                const isUser = message.role === "user"
                return (
                  <div
                    key={message.id}
                    className={cn(
                      "flex flex-col",
                      isUser ? "items-end" : "items-start"
                    )}
                  >
                    <div
                      className={cn(
                        "rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed select-text",
                        isUser
                          ? "bg-accent-primary-dim border-2 border-accent-primary/50 text-text-primary rounded-tr-sm max-w-[85%]"
                          : "bg-bg-elevated border border-border-default text-text-primary rounded-tl-sm max-w-[88%] shadow-sm"
                      )}
                    >
                      {message.content}
                    </div>
                    <span className="text-[10px] text-text-faint mt-1 px-1">
                      {message.timestamp}
                    </span>
                  </div>
                )
              })
            )}
          </div>

          {/* Sticky Input Area */}
          <div className="border-t border-border-default bg-bg-surface p-3 shrink-0">
            <div className="relative rounded-xl border border-border-default bg-bg-elevated focus-within:border-accent-ai transition-colors p-2 flex flex-col">
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={handleDraftChange}
                onKeyDown={handleKeyDown}
                placeholder="Ask Ghost AI to design or modify architecture... (Enter to send)"
                className="w-full min-h-[72px] max-h-[160px] resize-none bg-transparent text-xs text-text-primary placeholder:text-text-muted focus:outline-none leading-relaxed p-1"
                rows={3}
              />
              <div className="flex items-center justify-between pt-1 border-t border-border-subtle/50 mt-1">
                <span className="text-[10px] text-text-faint">
                  Shift+Enter for newline
                </span>
                <Button
                  size="sm"
                  onClick={handleSendMessage}
                  disabled={!draft.trim()}
                  className="h-7 px-3 bg-accent-ai hover:bg-accent-ai/90 text-white rounded-lg gap-1.5 text-xs font-medium cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Send className="h-3 w-3" />
                  <span>Send</span>
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* 5. Specs Tab */}
        <TabsContent
          value="specs"
          className="flex flex-1 flex-col overflow-y-auto p-4 space-y-4 m-0 outline-none"
        >
          {/* Generate Spec Action */}
          <Button
            className="w-full h-9 bg-accent-ai hover:bg-accent-ai/90 text-white rounded-lg gap-2 text-xs font-medium cursor-pointer transition-all shadow-md"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Generate Spec</span>
          </Button>

          {/* Demo Spec Card */}
          <div className="rounded-xl border border-border-default bg-bg-elevated p-3.5 flex flex-col gap-2.5 shadow-sm">
            <div className="flex items-start gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bg-subtle border border-border-subtle text-accent-ai">
                <FileText className="h-4 w-4" />
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <h4 className="text-xs font-semibold text-text-primary truncate">
                  Microservices Architecture Spec
                </h4>
                <span className="text-[10px] text-text-faint">
                  Draft • Generated via Ghost AI
                </span>
              </div>
            </div>

            <p className="text-xs text-text-muted leading-relaxed line-clamp-4">
              Comprehensive architectural specification detailing API gateway ingress routing, authentication boundaries, asynchronous event queuing with Kafka, and persistence SLA guarantees.
            </p>

            <Button
              disabled
              variant="outline"
              size="sm"
              className="w-full h-8 mt-1 gap-1.5 text-xs border-border-default bg-bg-surface text-text-muted opacity-40 cursor-not-allowed"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download Spec</span>
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </aside>
  )
}
