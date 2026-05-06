import { auth } from "@repo/auth/server"
import { NextRequest, NextResponse } from "next/server"
import { eq, and, isNull } from "drizzle-orm"
import { db, documents, partners } from "@repo/db"
import { z } from "zod"
import { getActiveTeamMember } from "@/lib/admin-auth"
import { getRequiredTenantId } from "@/lib/env"
import { hasAnyTeamRole, PARTNER_OPERATIONS_ROLES } from "@/lib/rbac"

const MAX_UPLOAD_SIZE = 8 * 1024 * 1024
const ALLOWED_UPLOAD_TYPES = new Set(["application/pdf", "image/png", "image/jpeg"])

const bodySchema = z.object({
  documentType: z.enum(["trade_license", "emirates_id", "passport"]),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 })

  const member = await getActiveTeamMember(userId)
  if (!member || !hasAnyTeamRole(member.role, PARTNER_OPERATIONS_ROLES)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 })
  }

  const tenantId = getRequiredTenantId()
  const { id: partnerId } = await params

  const [partner] = await db
    .select({ id: partners.id })
    .from(partners)
    .where(
      and(
        eq(partners.id, partnerId),
        eq(partners.tenantId, tenantId),
        isNull(partners.deletedAt)
      )
    )
    .limit(1)

  if (!partner) {
    return NextResponse.json({ error: "Partner not found." }, { status: 404 })
  }

  const formData = await request.formData()
  const file = formData.get("file")
  const documentTypeRaw = formData.get("documentType")

  const parsed = bodySchema.safeParse({
    documentType: typeof documentTypeRaw === "string" ? documentTypeRaw : "",
  })
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid document type." }, { status: 422 })
  }
  const { documentType } = parsed.data

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 })
  }

  if (!ALLOWED_UPLOAD_TYPES.has(file.type)) {
    return NextResponse.json({ error: "File must be PDF, PNG, or JPG." }, { status: 422 })
  }

  if (file.size > MAX_UPLOAD_SIZE) {
    return NextResponse.json({ error: "Upload must be under 8 MB." }, { status: 422 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const [document] = await db
    .insert(documents)
    .values({
      tenantId,
      ownerType: "partner",
      ownerId: partnerId,
      documentType,
      fileName: file.name || documentType,
      zohoWorkdriveId: `in-app:${partnerId}:${documentType}:${Date.now()}`,
      zohoWorkdriveUrl: "pending",
      storageProvider: "database",
      mimeType: file.type,
      fileDataBase64: buffer.toString("base64"),
      uploadedBy: userId,
      uploadedAt: new Date(),
    })
    .returning({ id: documents.id })

  if (document) {
    await db
      .update(documents)
      .set({ zohoWorkdriveUrl: `/api/documents/${document.id}` })
      .where(eq(documents.id, document.id))
  }

  return NextResponse.json({ documentId: document?.id ?? null })
}
