import { put, get } from "@vercel/blob"
import fs from "fs/promises"
import path from "path"
import { prisma, type ProjectSpec } from "@/lib/prisma"

/**
 * Saves a Markdown technical specification to Vercel Blob and records its metadata in Prisma.
 * Follows the same Vercel Blob + Prisma metadata pattern as canvas persistence.
 */
export async function saveProjectSpec(
  projectId: string,
  markdownContent: string,
  customSpecId?: string
): Promise<ProjectSpec> {
  const specId = customSpecId || `spec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  const blobPath = `specs/${projectId}/${specId}.md`
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN

  let blobUrl: string

  if (blobToken) {
    try {
      let blob
      try {
        blob = await put(blobPath, markdownContent, {
          access: "public",
          contentType: "text/markdown; charset=utf-8",
          addRandomSuffix: false,
          allowOverwrite: true,
        })
      } catch (accessErr: unknown) {
        // Handle private store configuration transparently
        const isPrivateStore =
          accessErr instanceof Error &&
          accessErr.message.toLowerCase().includes("private access")
        if (isPrivateStore) {
          blob = await put(blobPath, markdownContent, {
            access: "private",
            contentType: "text/markdown; charset=utf-8",
            addRandomSuffix: false,
            allowOverwrite: true,
          })
        } else {
          throw accessErr
        }
      }
      blobUrl = blob.url
    } catch (blobErr) {
      console.warn(
        "[SpecStorage] Vercel Blob upload failed, falling back to local filesystem storage:",
        blobErr
      )
      const localDir = path.join(process.cwd(), ".data", "specs", projectId)
      await fs.mkdir(localDir, { recursive: true })
      const localFilePath = path.join(localDir, `${specId}.md`)
      await fs.writeFile(localFilePath, markdownContent, "utf-8")
      blobUrl = `local:${localFilePath}`
    }
  } else {
    // Development fallback when BLOB_READ_WRITE_TOKEN is not configured
    console.warn(
      "[SpecStorage] BLOB_READ_WRITE_TOKEN is not configured. Falling back to local filesystem storage."
    )
    const localDir = path.join(process.cwd(), ".data", "specs", projectId)
    await fs.mkdir(localDir, { recursive: true })
    const localFilePath = path.join(localDir, `${specId}.md`)
    await fs.writeFile(localFilePath, markdownContent, "utf-8")
    blobUrl = `local:${localFilePath}`
  }

  // Create ProjectSpec record in Prisma for metadata tracking
  const specRecord = await prisma.projectSpec.create({
    data: {
      id: specId,
      projectId,
      filePath: blobUrl,
    },
  })

  return specRecord
}

/**
 * Retrieves the raw Markdown content of a specification given its stored filePath (Blob URL or local path).
 */
export async function fetchSpecContent(filePath: string): Promise<string | null> {
  if (!filePath) return null

  try {
    if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
      if (filePath.includes(".private.blob.vercel-storage.com")) {
        const blobRes = await get(filePath, { access: "private" })
        if (blobRes) {
          return await new Response(blobRes.stream).text()
        }
      } else {
        const response = await fetch(filePath, {
          cache: "no-store",
        })

        if (response.ok) {
          return await response.text()
        } else if (response.status === 403) {
          const blobRes = await get(filePath, { access: "private" })
          if (blobRes) {
            return await new Response(blobRes.stream).text()
          }
        } else {
          console.error(
            `[SpecStorage] Failed to fetch spec from Vercel Blob: ${response.status} ${response.statusText}`
          )
        }
      }
      return null
    } else if (filePath.startsWith("local:")) {
      const localPath = filePath.replace(/^local:/, "")
      try {
        return await fs.readFile(localPath, "utf-8")
      } catch (err) {
        console.warn("[SpecStorage] Local spec file not found:", err)
        return null
      }
    }
    return null
  } catch (err) {
    console.error("[SpecStorage] Error reading spec content:", err)
    return null
  }
}
