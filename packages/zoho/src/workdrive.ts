const WORKDRIVE_BASE_URL =
  process.env.ZOHO_WORKDRIVE_BASE_URL || "https://workdrive.zoho.com/api/v1"

function getWorkdriveToken(): string {
  const token = process.env.ZOHO_WORKDRIVE_ACCESS_TOKEN
  if (!token) {
    throw new Error("[zoho/workdrive] Missing ZOHO_WORKDRIVE_ACCESS_TOKEN")
  }
  return token
}

export async function getWorkdriveUploadUrl(
  folderId: string,
  fileName: string
): Promise<{ uploadUrl: string; fileId: string } | null> {
  try {
    const token = getWorkdriveToken()

    const res = await fetch(`${WORKDRIVE_BASE_URL}/upload`, {
      method: "POST",
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filename: fileName,
        parent_id: folderId,
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error("[zoho/workdrive] getWorkdriveUploadUrl failed", {
        folderId,
        fileName,
        status: res.status,
        body: text,
      })
      return null
    }

    const data = (await res.json()) as {
      attributes: { upload_url: string; resource_id: string }
    }

    return {
      uploadUrl: data.attributes.upload_url,
      fileId: data.attributes.resource_id,
    }
  } catch (error) {
    console.error("[zoho/workdrive] getWorkdriveUploadUrl error", {
      folderId,
      fileName,
      error: String(error),
    })
    return null
  }
}

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg",
])

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

export async function uploadToWorkdrive(
  folderId: string,
  fileName: string,
  fileBuffer: Buffer,
  mimeType: string
): Promise<{ fileId: string; fileUrl: string } | null> {
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    console.error("[zoho/workdrive] Rejected upload: disallowed MIME type", { mimeType, fileName })
    return null
  }

  if (fileBuffer.length > MAX_FILE_SIZE) {
    console.error("[zoho/workdrive] Rejected upload: file exceeds 10 MB", { size: fileBuffer.length, fileName })
    return null
  }

  try {
    const token = getWorkdriveToken()
    const blobBytes = Uint8Array.from(fileBuffer)

    const formData = new FormData()
    formData.append(
      "content",
      new Blob([blobBytes], { type: mimeType }),
      fileName
    )
    formData.append("filename", fileName)
    formData.append("parent_id", folderId)
    formData.append("override-name-exist", "true")

    const res = await fetch(`${WORKDRIVE_BASE_URL}/upload`, {
      method: "POST",
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
      },
      body: formData,
    })

    if (!res.ok) {
      const text = await res.text()
      console.error("[zoho/workdrive] uploadToWorkdrive failed", {
        folderId,
        fileName,
        status: res.status,
        body: text,
      })
      return null
    }

    const data = (await res.json()) as {
      data: Array<{
        attributes: { resource_id: string; permalink: string }
      }>
    }

    const file = data.data?.[0]?.attributes
    if (!file) return null

    return {
      fileId: file.resource_id,
      fileUrl: file.permalink,
    }
  } catch (error) {
    console.error("[zoho/workdrive] uploadToWorkdrive error", {
      folderId,
      fileName,
      error: String(error),
    })
    return null
  }
}

export async function getWorkdriveFileUrl(fileId: string): Promise<string | null> {
  try {
    const token = getWorkdriveToken()

    const res = await fetch(`${WORKDRIVE_BASE_URL}/files/${fileId}/download`, {
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
      },
    })

    if (!res.ok) {
      const text = await res.text()
      console.error("[zoho/workdrive] getWorkdriveFileUrl failed", {
        fileId,
        status: res.status,
        body: text,
      })
      return null
    }

    const data = (await res.json()) as { download_url: string }
    return data.download_url ?? null
  } catch (error) {
    console.error("[zoho/workdrive] getWorkdriveFileUrl error", {
      fileId,
      error: String(error),
    })
    return null
  }
}

export async function ensureEntityFolder(
  entityType: string,
  entityId: string,
  parentFolderId: string
): Promise<string | null> {
  try {
    const token = getWorkdriveToken()
    const folderName = `${entityType}_${entityId}`

    // Search for existing folder
    const searchRes = await fetch(
      `${WORKDRIVE_BASE_URL}/files?filter=folder&parent_id=${parentFolderId}`,
      {
        headers: {
          Authorization: `Zoho-oauthtoken ${token}`,
        },
      }
    )

    if (searchRes.ok) {
      const searchData = (await searchRes.json()) as {
        data: Array<{ attributes: { resource_id: string; name: string } }>
      }

      const existing = searchData.data?.find(
        (f) => f.attributes.name === folderName
      )
      if (existing) {
        return existing.attributes.resource_id
      }
    }

    // Create folder if not found
    const createRes = await fetch(`${WORKDRIVE_BASE_URL}/files`, {
      method: "POST",
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: {
          attributes: {
            name: folderName,
            parent_id: parentFolderId,
          },
          type: "files",
        },
      }),
    })

    if (!createRes.ok) {
      const text = await createRes.text()
      console.error("[zoho/workdrive] ensureEntityFolder create failed", {
        entityType,
        entityId,
        parentFolderId,
        status: createRes.status,
        body: text,
      })
      return null
    }

    const createData = (await createRes.json()) as {
      data: { attributes: { resource_id: string } }
    }

    return createData.data?.attributes?.resource_id ?? null
  } catch (error) {
    console.error("[zoho/workdrive] ensureEntityFolder error", {
      entityType,
      entityId,
      parentFolderId,
      error: String(error),
    })
    return null
  }
}
