import { NextResponse } from "next/server"
import { auth, clerkClient } from "@clerk/nextjs/server"
import { getProjectAccess, getCurrentUserIdentity } from "@/lib/project-access"
import { liveblocks, getUserColor } from "@/lib/liveblocks"

export async function POST(req: Request) {
  // 1. Require Clerk authentication
  const { userId, sessionClaims } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Parse request body for room ID (Liveblocks client sends { room: roomId })
  let body: Record<string, unknown> = {}
  try {
    body = await req.json()
  } catch {
    // Empty or non-JSON body
  }

  const url = new URL(req.url)
  const rawRoomId =
    body.room ??
    body.roomId ??
    body.projectId ??
    url.searchParams.get("room") ??
    url.searchParams.get("roomId") ??
    url.searchParams.get("projectId")

  if (typeof rawRoomId !== "string" || !rawRoomId.trim()) {
    return NextResponse.json(
      { error: "Room ID (project ID) is required" },
      { status: 400 }
    )
  }

  const roomId = rawRoomId.trim()

  // 2. Verify project access using the existing access helper
  const identity = await getCurrentUserIdentity()
  const accessResult = await getProjectAccess(roomId, identity)

  if (!accessResult.hasAccess || !accessResult.project) {
    return NextResponse.json(
      { error: "Forbidden: You do not have access to this project" },
      { status: 403 }
    )
  }

  const project = accessResult.project

  // 3. Ensure the Liveblocks room exists (create only if needed)
  try {
    await liveblocks.getOrCreateRoom(roomId, {
      defaultAccesses: [],
      metadata: {
        title: project.name,
        ownerId: project.ownerId,
      },
    })
  } catch (roomErr) {
    // Non-fatal if room already exists or in development without live API key
    console.warn(`[Liveblocks] getOrCreateRoom notice for room ${roomId}:`, roomErr)
  }

  // 4. Resolve user metadata (name, avatar, generated cursor color)
  let userName = "Collaborator"
  let userAvatar = ""

  // Extract primary email prefix as initial fallback
  const claims = sessionClaims as Record<string, unknown> | null
  const claimEmail =
    typeof claims?.email === "string"
      ? claims.email
      : typeof claims?.primary_email === "string"
      ? claims.primary_email
      : identity?.primaryEmail ?? null

  if (claimEmail) {
    userName = claimEmail.split("@")[0]
  }

  // Enrich with Clerk user profile if available
  try {
    const client = await clerkClient()
    const clerkUser = await client.users.getUser(userId)
    if (clerkUser) {
      const fullName = [clerkUser.firstName, clerkUser.lastName]
        .filter(Boolean)
        .join(" ")
      userName =
        fullName ||
        clerkUser.username ||
        clerkUser.emailAddresses?.[0]?.emailAddress?.split("@")[0] ||
        userName
      userAvatar = clerkUser.imageUrl || ""
    }
  } catch (clerkErr) {
    console.warn("[Liveblocks Auth] Clerk profile lookup notice:", clerkErr)
  }

  // Deterministically map user ID to consistent cursor color from fixed palette
  const cursorColor = getUserColor(userId)

  // 5. Prepare Liveblocks session with user metadata and room permissions
  const session = liveblocks.prepareSession(userId, {
    userInfo: {
      name: userName,
      displayName: userName,
      avatar: userAvatar,
      avatarUrl: userAvatar,
      color: cursorColor,
      cursorColor: cursorColor,
    },
  })

  // Grant full write and read access to this verified project room
  session.allow(roomId, session.FULL_ACCESS)

  try {
    const { status, body: sessionBody } = await session.authorize()
    return new Response(sessionBody, {
      status,
      headers: {
        "Content-Type": "application/json",
      },
    })
  } catch (authErr) {
    console.error("[Liveblocks Auth] Session authorization error:", authErr)
    return NextResponse.json(
      { error: "Failed to authorize Liveblocks session" },
      { status: 500 }
    )
  }
}
