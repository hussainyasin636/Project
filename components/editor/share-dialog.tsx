"use client"

import { useState, useEffect, useCallback, useRef, useSyncExternalStore } from "react"
import {
  Copy,
  Check,
  UserPlus,
  Trash2,
  Loader2,
  Shield,
  Users,
  AlertCircle,
  RefreshCw,
  X,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useWorkspace } from "@/hooks/use-workspace"
import { cn } from "@/lib/utils"
import type { Project } from "@/types/project"

export interface EnrichedCollaborator {
  id: string
  projectId: string
  email: string
  createdAt: string
  name: string | null
  avatarUrl: string | null
}

export interface OwnerInfo {
  id: string
  name: string | null
  email: string | null
  avatarUrl: string | null
}

interface ShareDialogProps {
  project: Project
  isOwner: boolean
  isCollaborator?: boolean
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function MemberAvatar({
  name,
  email,
  avatarUrl,
  isOwner = false,
}: {
  name: string | null
  email: string | null
  avatarUrl: string | null
  isOwner?: boolean
}) {
  const [imageError, setImageError] = useState(false)
  const initial = (name || email || "?").charAt(0).toUpperCase()

  if (avatarUrl && !imageError) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={avatarUrl}
        alt={name || email || "User avatar"}
        onError={() => setImageError(true)}
        className="h-7 w-7 rounded-full object-cover shrink-0 border border-border-subtle"
      />
    )
  }

  if (isOwner) {
    return (
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-primary/10 border border-accent-primary/20 text-accent-primary shrink-0">
        <Shield className="h-3.5 w-3.5" aria-hidden="true" />
      </div>
    )
  }

  return (
    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-bg-subtle border border-border-default text-text-secondary text-[11px] font-medium shrink-0 select-none">
      {initial}
    </div>
  )
}

export function ShareDialog({ project, isOwner }: ShareDialogProps) {
  const workspace = useWorkspace()
  const isOpen = Boolean(workspace?.isShareDialogOpen)

  const [collaborators, setCollaborators] = useState<EnrichedCollaborator[]>([])
  const [owner, setOwner] = useState<OwnerInfo | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const origin = useSyncExternalStore(
    () => () => {},
    () => (typeof window !== "undefined" ? window.location.origin : ""),
    () => ""
  )

  // Invite state
  const [inviteEmail, setInviteEmail] = useState("")
  const [isInviting, setIsInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null)

  // Delete state with confirmation protection
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const successTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  


  // Clean up timeouts and abort controllers on unmount
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current)
      if (abortControllerRef.current) abortControllerRef.current.abort()
    }
  }, [])

  // Fetch collaborators and owner when dialog opens
  const fetchCollaborators = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    const controller = new AbortController()
    abortControllerRef.current = controller

    setIsLoading(true)
    setFetchError(null)

    try {
      const res = await fetch(`/api/projects/${project.id}/collaborators`, {
        signal: controller.signal,
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `Failed to load collaborators (Status ${res.status})`)
      }

      const data = await res.json()
      setOwner(data.owner || null)
      setCollaborators(data.collaborators || [])
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return
      }
      const message = err instanceof Error ? err.message : "Failed to load collaborators"
      console.warn("Could not load collaborators:", message)
      setFetchError(message)
    } finally {
      setIsLoading(false)
    }
  }, [project.id])

  useEffect(() => {
    let ignore = false
    if (isOpen) {
      void Promise.resolve().then(() => {
        if (!ignore) {
          fetchCollaborators()
        }
      })
    }
    return () => {
      ignore = true
    }
  }, [isOpen, fetchCollaborators])

  // Copy project workspace link with fallback
  const handleCopyLink = useCallback(async () => {
    const fallbackOrigin = typeof window !== "undefined" ? window.location.origin : ""
    const currentOrigin = origin || fallbackOrigin
    const url = currentOrigin ? `${currentOrigin}/editor/${project.id}` : `/editor/${project.id}`

    let successful = false

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(url)
        successful = true
      }
    } catch {
      // Fallback for restricted clipboard contexts
    }

    if (!successful && typeof document !== "undefined") {
      try {
        const input = document.getElementById("project-share-link") as HTMLInputElement | null
        if (input) {
          input.select()
          document.execCommand("copy")
          successful = true
        }
      } catch {
        setActionError("Could not copy link to clipboard.")
      }
    }

    if (successful) {
      setCopied(true)
      setActionError(null)
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
      copyTimeoutRef.current = setTimeout(() => {
        setCopied(false)
      }, 2000)
    }
  }, [origin, project.id])

  // Invite collaborator
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setActionError(null)
    setInviteSuccess(null)

    const trimmed = inviteEmail.trim().toLowerCase()
    if (!trimmed) return

    if (!EMAIL_REGEX.test(trimmed)) {
      setInviteError("Please enter a valid email address.")
      return
    }

    if (owner?.email && owner.email.toLowerCase() === trimmed) {
      setInviteError("You are already the owner of this project.")
      return
    }

    if (collaborators.some((c) => c.email.toLowerCase() === trimmed)) {
      setInviteError("This user is already a collaborator.")
      return
    }

    setIsInviting(true)
    setInviteError(null)

    try {
      const res = await fetch(`/api/projects/${project.id}/collaborators`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: trimmed }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to invite collaborator")
      }

      setCollaborators((prev) => [...prev, data])
      setInviteEmail("")
      setInviteSuccess(`Invited ${trimmed}`)
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current)
      successTimeoutRef.current = setTimeout(() => {
        setInviteSuccess(null)
      }, 3000)
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to invite collaborator"
      setInviteError(message)
    } finally {
      setIsInviting(false)
    }
  }

  // Remove collaborator
  const handleRemoveCollaborator = async (collaboratorId: string) => {
    setDeletingId(collaboratorId)
    setActionError(null)

    try {
      const res = await fetch(
        `/api/projects/${project.id}/collaborators/${collaboratorId}`,
        {
          method: "DELETE",
        }
      )

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to remove collaborator")
      }

      setCollaborators((prev) => prev.filter((c) => c.id !== collaboratorId))
      setConfirmRemoveId(null)
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to remove collaborator"
      setActionError(message)
    } finally {
      setDeletingId(null)
    }
  }

  const projectUrl = origin
    ? `${origin}/editor/${project.id}`
    : `/editor/${project.id}`

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
          if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current)
          if (abortControllerRef.current) abortControllerRef.current.abort()
          setConfirmRemoveId(null)
          setActionError(null)
          setInviteEmail("")
          setInviteError(null)
          setInviteSuccess(null)
          setCopied(false)
          workspace?.closeShareDialog()
        }
      }}
    >
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto rounded-3xl border border-border-default bg-bg-surface p-6 shadow-2xl">
        <DialogHeader className="gap-1.5 pb-2">
          <DialogTitle className="text-base font-semibold text-text-primary">
            Share &quot;{project.name}&quot;
          </DialogTitle>
          <DialogDescription className="text-xs text-text-muted">
            Collaborate in real time. Anyone with access can view and edit this workspace.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5 pt-1">
          {/* Action error banner */}
          {actionError && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-xl border border-state-error/30 bg-state-error/10 p-2.5 text-xs text-state-error"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="flex-1">{actionError}</span>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setActionError(null)}
                className="h-5 w-5 text-state-error hover:bg-state-error/20"
                aria-label="Dismiss error"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}

          {/* Copy link section */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="project-share-link"
              className="text-xs font-medium text-text-secondary"
            >
              Project Link
            </label>
            <div className="flex items-center gap-2">
              <Input
                id="project-share-link"
                readOnly
                aria-label="Project share link"
                value={projectUrl}
                className="h-8 bg-bg-elevated font-mono text-xs text-text-secondary border-border-default focus-visible:ring-0"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                aria-label={copied ? "Link copied to clipboard" : "Copy project link"}
                className={cn(
                  "h-8 shrink-0 gap-1.5 px-3 text-xs border-border-default bg-bg-surface hover:bg-bg-subtle transition-colors",
                  copied && "text-state-success border-state-success/40"
                )}
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-state-success" aria-hidden="true" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-text-secondary" aria-hidden="true" />
                    <span>Copy Link</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Invite section: Owners only */}
          {isOwner && (
            <div className="flex flex-col gap-2">
              <label
                htmlFor="invite-collaborator-email"
                className="text-xs font-medium text-text-secondary"
              >
                Invite Collaborators
              </label>
              <form onSubmit={handleInvite} className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Input
                    id="invite-collaborator-email"
                    type="email"
                    placeholder="colleague@example.com"
                    aria-label="Collaborator email address"
                    value={inviteEmail}
                    onChange={(e) => {
                      setInviteEmail(e.target.value)
                      if (inviteError) setInviteError(null)
                    }}
                    disabled={isInviting}
                    className="h-8 bg-bg-elevated text-xs text-text-primary border-border-default placeholder:text-text-faint"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isInviting || !inviteEmail.trim()}
                    className="h-8 shrink-0 gap-1.5 px-3 text-xs"
                  >
                    {isInviting ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                        <span>Inviting...</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Invite</span>
                      </>
                    )}
                  </Button>
                </div>

                {inviteError && (
                  <p role="alert" className="text-xs text-state-error">
                    {inviteError}
                  </p>
                )}

                {inviteSuccess && (
                  <p role="status" className="text-xs text-state-success">
                    {inviteSuccess}
                  </p>
                )}
              </form>
            </div>
          )}

          {/* Collaborator list */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text-secondary flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
                <span>Members ({1 + collaborators.length})</span>
              </span>

              {fetchError && (
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={fetchCollaborators}
                  className="h-6 gap-1 text-[11px] text-text-muted hover:text-text-primary"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Retry</span>
                </Button>
              )}
            </div>

            <div className="flex flex-col divide-y divide-border-default rounded-xl border border-border-default bg-bg-elevated/40 overflow-hidden max-h-56 overflow-y-auto">
              {/* Owner row */}
              <div className="flex items-center justify-between p-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <MemberAvatar
                    name={owner?.name || null}
                    email={owner?.email || null}
                    avatarUrl={owner?.avatarUrl || null}
                    isOwner={true}
                  />

                  <div className="flex flex-col min-w-0">
                    <span className="truncate text-xs font-medium text-text-primary">
                      {owner?.name || owner?.email || "Project Owner"}
                    </span>
                    {owner?.name && owner?.email && (
                      <span className="truncate text-[11px] text-text-muted">
                        {owner.email}
                      </span>
                    )}
                  </div>
                </div>

                <span className="shrink-0 rounded-full border border-border-default bg-bg-subtle px-2 py-0.5 text-[10px] font-medium text-text-muted">
                  Owner
                </span>
              </div>

              {/* Collaborators list loading state */}
              {isLoading && collaborators.length === 0 ? (
                <div className="flex items-center justify-center p-4 text-xs text-text-muted gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  <span>Loading collaborators...</span>
                </div>
              ) : fetchError && collaborators.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-4 text-center gap-2">
                  <p className="text-xs text-state-error">{fetchError}</p>
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={fetchCollaborators}
                    className="gap-1.5 text-xs"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>Try again</span>
                  </Button>
                </div>
              ) : collaborators.length === 0 ? (
                <div className="p-3 text-center text-xs text-text-muted">
                  No collaborators invited yet.
                </div>
              ) : (
                collaborators.map((collab) => {
                  const isConfirming = confirmRemoveId === collab.id
                  const isDeleting = deletingId === collab.id

                  return (
                    <div
                      key={collab.id}
                      className="flex items-center justify-between p-2.5 group transition-colors hover:bg-bg-subtle/50"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <MemberAvatar
                          name={collab.name}
                          email={collab.email}
                          avatarUrl={collab.avatarUrl}
                        />

                        <div className="flex flex-col min-w-0">
                          <span className="truncate text-xs font-medium text-text-primary">
                            {collab.name || collab.email}
                          </span>
                          {collab.name && (
                            <span className="truncate text-[11px] text-text-muted">
                              {collab.email}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isConfirming ? (
                          <div className="flex items-center gap-1 animate-in fade-in-0 duration-100">
                            <span className="text-[10px] text-state-error font-medium">
                              Remove?
                            </span>
                            <Button
                              variant="destructive"
                              size="icon-xs"
                              onClick={() => handleRemoveCollaborator(collab.id)}
                              disabled={isDeleting}
                              aria-label={`Confirm remove ${collab.name || collab.email}`}
                              className="h-6 px-1.5 text-[10px]"
                            >
                              {isDeleting ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                "Yes"
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => setConfirmRemoveId(null)}
                              disabled={isDeleting}
                              aria-label="Cancel removal"
                              className="h-6 px-1.5 text-[10px]"
                            >
                              No
                            </Button>
                          </div>
                        ) : (
                          <>
                            <span className="text-[10px] text-text-muted mr-0.5">
                              Can edit
                            </span>

                            {/* Remove button: Owners only */}
                            {isOwner && (
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => setConfirmRemoveId(collab.id)}
                                disabled={Boolean(deletingId)}
                                className="h-6 w-6 text-text-muted hover:text-state-error hover:bg-state-error/10 transition-colors"
                                aria-label={`Remove collaborator ${collab.name || collab.email}`}
                                title="Remove collaborator"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {!isOwner && (
              <p className="text-[11px] text-text-faint text-center pt-1">
                You have collaborator permissions for this workspace.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
