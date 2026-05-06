import { auth } from "@repo/auth/server"
import { NextRequest, NextResponse } from "next/server"
import { and, eq, isNull } from "drizzle-orm"
import { rateLimit } from "@repo/auth"
import { db, documents, partnerClients, partners } from "@repo/db"

const MAX_UPLOAD_SIZE = 8 * 1024 * 1024
const ALLOWED_UPLOAD_TYPES = new Set(["application/pdf", "image/png", "image/jpeg"])

function readString(formData: FormData, name: string) {
  const raw = formData.get(name)
  if (typeof raw !== "string") return null
  const trimmed = raw.trim()
  return trimmed.length > 0 ? trimmed : null
}

async function getPartner(userId: string) {
  const [partner] = await db.select().from(partners).where(eq(partners.authUserId, userId)).limit(1)
  return partner ?? null
}

async function storeTradeLicenseFile(params: {
  file: File
  tenantId: string
  clientId: string
  uploadedBy: string
}) {
  if (!ALLOWED_UPLOAD_TYPES.has(params.file.type)) {
    return NextResponse.json({ error: "Trade license must be PDF, PNG, or JPG." }, { status: 422 })
  }

  if (params.file.size > MAX_UPLOAD_SIZE) {
    return NextResponse.json({ error: "Trade license upload must be under 8 MB." }, { status: 422 })
  }

  const buffer = Buffer.from(await params.file.arrayBuffer())
  const [document] = await db
    .insert(documents)
    .values({
      tenantId: params.tenantId,
      ownerType: "partner_client",
      ownerId: params.clientId,
      documentType: "trade_license",
      fileName: params.file.name || "trade-license",
      zohoWorkdriveId: `in-app:${params.clientId}:trade_license:${Date.now()}`,
      zohoWorkdriveUrl: "pending",
      storageProvider: "database",
      mimeType: params.file.type,
      fileDataBase64: buffer.toString("base64"),
      uploadedBy: params.uploadedBy,
      uploadedAt: new Date(),
    })
    .returning({ id: documents.id })

  if (document) {
    await db.update(documents).set({ zohoWorkdriveUrl: `/api/documents/${document.id}` }).where(eq(documents.id, document.id))
  }

  return null
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 })

  const limited = rateLimit(`partner-client-update:${userId}`, 30, 60_000)
  if (limited) return limited

  const partner = await getPartner(userId)
  if (!partner) return NextResponse.json({ error: "Partner account not found." }, { status: 404 })

  const { id } = await params
  const [client] = await db
    .select()
    .from(partnerClients)
    .where(and(eq(partnerClients.id, id), eq(partnerClients.partnerId, partner.id), isNull(partnerClients.deletedAt)))
    .limit(1)

  if (!client) return NextResponse.json({ error: "Client not found." }, { status: 404 })

  const formData = await request.formData()
  const companyName = readString(formData, "companyName")
  const contactName = readString(formData, "contactName")

  if (!companyName || !contactName) {
    return NextResponse.json({ error: "Company and contact name are required." }, { status: 422 })
  }

  const renewalDate = readString(formData, "renewalDate")
  const status = readString(formData, "status") ?? "active"
  if (!["active", "watchlist", "inactive"].includes(status)) {
    return NextResponse.json({ error: "Invalid client status." }, { status: 422 })
  }

  const [updated] = await db
    .update(partnerClients)
    .set({
      companyName,
      contactName,
      email: readString(formData, "email"),
      phone: readString(formData, "phone"),
      nationality: readString(formData, "nationality"),
      tradeLicenseNumber: readString(formData, "tradeLicenseNumber"),
      country: readString(formData, "country"),
      city: readString(formData, "city"),
      status,
      renewalDate: renewalDate ? new Date(renewalDate) : null,
      notes: readString(formData, "notes"),
      updatedAt: new Date(),
    })
    .where(eq(partnerClients.id, id))
    .returning()

  const tradeLicenseFile = formData.get("tradeLicenseFile")
  if (tradeLicenseFile instanceof File && tradeLicenseFile.size > 0) {
    const uploadError = await storeTradeLicenseFile({
      file: tradeLicenseFile,
      tenantId: partner.tenantId,
      clientId: id,
      uploadedBy: userId,
    })
    if (uploadError) return uploadError
  }

  return NextResponse.json({ partnerClient: updated })
}