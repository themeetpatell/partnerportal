import { auth, currentUser } from "@repo/auth/server"
import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db, documents } from "@repo/db"
import { getPartnerRecordForAuthenticatedUser } from "@/lib/partner-record"

const MAX_UPLOAD_SIZE = 8 * 1024 * 1024
const ALLOWED_UPLOAD_TYPES = new Set(["application/pdf", "image/png", "image/jpeg"])

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 })

  const user = await currentUser()
  const partner = await getPartnerRecordForAuthenticatedUser({ userId, email: user?.email })
  if (!partner) return NextResponse.json({ error: "Partner record not found." }, { status: 404 })

  const formData = await request.formData()
  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 })
  }

  if (!ALLOWED_UPLOAD_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Trade license must be PDF, PNG, or JPG." }, { status: 422 })
  }

  if (file.size > MAX_UPLOAD_SIZE) {
    return NextResponse.json({ error: "Trade license upload must be under 8 MB." }, { status: 422 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const [document] = await db
    .insert(documents)
    .values({
      tenantId: partner.tenantId,
      ownerType: "partner",
      ownerId: partner.id,
      documentType: "trade_license",
      fileName: file.name || "trade-license",
      zohoWorkdriveId: `in-app:${partner.id}:trade_license:${Date.now()}`,
      zohoWorkdriveUrl: "pending",
      storageProvider: "database",
      mimeType: file.type,
      fileDataBase64: buffer.toString("base64"),
      uploadedBy: userId,
      uploadedAt: new Date(),
    })
    .returning({ id: documents.id })

  if (document) {
    await db.update(documents).set({ zohoWorkdriveUrl: `/api/documents/${document.id}` }).where(eq(documents.id, document.id))
  }

  return NextResponse.json({ documentId: document?.id ?? null })
}