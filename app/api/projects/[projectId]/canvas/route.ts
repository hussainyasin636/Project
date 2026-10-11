import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { put, get, del } from "@vercel/blob"
import fs from "fs/promises"
import path from "path"
import { prisma } from "@/lib/prisma"
import { getProjectAccess } from "@/lib/project-access"
import type { CanvasNode, CanvasEdge } from "@/types/canvas"

interface RouteParams {
  params: Promise<{
    projectId: string
  }>
}

interface CanvasPayload {
  nodes?: CanvasNode[]
  edges?: CanvasEdge[]
}

/**
 * PUT /api/projects/[projectId]/canvas
 * Receives the latest canvas JSON ({ nodes, edges }), uploads the JSON to Vercel Blob
 * (handling both public and private stores), and stores the returned blob URL on the
 * matching Prisma project record.
 */
export async function PUT(req: Request, { params }: RouteParams) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { projectId } = await params
  if (!projectId) {
    return NextResponse.json({ error: "Invalid project ID" }, { status: 400 })
  }

  const { hasAccess, project } = await getProjectAccess(projectId)
  if (!hasAccess || !project) {
    return NextResponse.json(
      { error: "Forbidden or project not found" },
      { status: 403 }
    )
  }

  let body: CanvasPayload = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const nodes = Array.isArray(body.nodes) ? body.nodes : []
  const edges = Array.isArray(body.edges) ? body.edges : []

  const payloadString = JSON.stringify({ nodes, edges })
  let blobUrl: string

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN

  if (blobToken) {
    try {
      let blob
      try {
        // Try public access first with fixed pathname and allowOverwrite
        blob = await put(`canvas/${projectId}.json`, payloadString, {
          access: "public",
          contentType: "application/json",
          addRandomSuffix: false,
          allowOverwrite: true,
        })
      } catch (accessErr: unknown) {
        // Handle private store configuration transparently
        const isPrivateStore =
          accessErr instanceof Error &&
          accessErr.message.toLowerCase().includes("private access")
        if (isPrivateStore) {
          blob = await put(`canvas/${projectId}.json`, payloadString, {
            access: "private",
            contentType: "application/json",
            addRandomSuffix: false,
            allowOverwrite: true,
          })
        } else {
          throw accessErr
        }
      }
      blobUrl = blob.url

      // If the project had an older blob URL from a previous suffix-based save, clean it up
      if (
        project.canvasJsonPath &&
        project.canvasJsonPath !== blobUrl &&
        (project.canvasJsonPath.startsWith("http://") ||
          project.canvasJsonPath.startsWith("https://"))
      ) {
        try {
          await del(project.canvasJsonPath)
        } catch (delErr) {
          console.warn("[Canvas API] Notice: could not remove legacy blob file:", delErr)
        }
      }
    } catch (blobErr) {
      console.warn(
        "[Canvas API] Vercel Blob upload failed, falling back to local filesystem storage:",
        blobErr
      )
      // Resilient fallback so canvas state is preserved even during blob service issues
      const localDir = path.join(process.cwd(), ".data", "canvas")
      await fs.mkdir(localDir, { recursive: true })
      const filePath = path.join(localDir, `${projectId}.json`)
      await fs.writeFile(filePath, payloadString, "utf-8")
      blobUrl = `local:${filePath}`
    }
  } else {
    // Development fallback when BLOB_READ_WRITE_TOKEN is not configured
    console.warn(
      "[Canvas API] BLOB_READ_WRITE_TOKEN is not configured. Falling back to local filesystem storage for development."
    )
    const localDir = path.join(process.cwd(), ".data", "canvas")
    await fs.mkdir(localDir, { recursive: true })
    const filePath = path.join(localDir, `${projectId}.json`)
    await fs.writeFile(filePath, payloadString, "utf-8")
    blobUrl = `local:${filePath}`
  }

  // Update Prisma Project record with the new canvas blob URL
  await prisma.project.update({
    where: { id: projectId },
    data: {
      canvasJsonPath: blobUrl,
    },
  })

  return NextResponse.json({
    success: true,
    url: blobUrl,
  })
}

/**
 * GET /api/projects/[projectId]/canvas
 * Reads the project's saved blob URL from Prisma, fetches the saved canvas JSON from Vercel Blob
 * (handling both public and private stores), and returns the canvas state to the editor.
 */
export async function GET(_req: Request, { params }: RouteParams) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { projectId } = await params
  if (!projectId) {
    return NextResponse.json({ error: "Invalid project ID" }, { status: 400 })
  }

  const { hasAccess, project } = await getProjectAccess(projectId)
  if (!hasAccess || !project) {
    return NextResponse.json(
      { error: "Forbidden or project not found" },
      { status: 403 }
    )
  }

  if (!project.canvasJsonPath) {
    return NextResponse.json({
      nodes: [],
      edges: [],
      url: null,
    })
  }

  // Fetch from Vercel Blob URL or local dev fallback
  try {
    if (
      project.canvasJsonPath.startsWith("http://") ||
      project.canvasJsonPath.startsWith("https://")
    ) {
      let data: CanvasPayload | null = null

      if (project.canvasJsonPath.includes(".private.blob.vercel-storage.com")) {
        // Authenticated retrieval for private blob stores
        const blobRes = await get(project.canvasJsonPath, { access: "private" })
        if (blobRes) {
          data = (await new Response(blobRes.stream).json()) as CanvasPayload
        }
      } else {
        // Public blob retrieval with fallback to private get
        const response = await fetch(project.canvasJsonPath, {
          cache: "no-store",
        })

        if (response.ok) {
          data = (await response.json()) as CanvasPayload
        } else if (response.status === 403) {
          const blobRes = await get(project.canvasJsonPath, { access: "private" })
          if (blobRes) {
            data = (await new Response(blobRes.stream).json()) as CanvasPayload
          }
        } else {
          console.error(
            `[Canvas API] Failed to fetch canvas from Vercel Blob: ${response.status} ${response.statusText}`
          )
        }
      }

      return NextResponse.json({
        nodes: Array.isArray(data?.nodes) ? data.nodes : [],
        edges: Array.isArray(data?.edges) ? data.edges : [],
        url: project.canvasJsonPath,
      })
    } else if (project.canvasJsonPath.startsWith("local:")) {
      const filePath = project.canvasJsonPath.replace(/^local:/, "")
      try {
        const fileContent = await fs.readFile(filePath, "utf-8")
        const data = JSON.parse(fileContent) as CanvasPayload
        return NextResponse.json({
          nodes: Array.isArray(data.nodes) ? data.nodes : [],
          edges: Array.isArray(data.edges) ? data.edges : [],
          url: project.canvasJsonPath,
        })
      } catch (err) {
        console.warn("[Canvas API] Local canvas file not found or corrupted:", err)
        return NextResponse.json({
          nodes: [],
          edges: [],
          url: null,
        })
      }
    } else {
      return NextResponse.json({
        nodes: [],
        edges: [],
        url: null,
      })
    }
  } catch (fetchErr) {
    console.error("[Canvas API] Error retrieving canvas JSON:", fetchErr)
    return NextResponse.json(
      { error: "Failed to fetch canvas state" },
      { status: 500 }
    )
  }
}
