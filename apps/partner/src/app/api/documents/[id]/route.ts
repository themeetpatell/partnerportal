import { auth, currentUser } from "@repo/auth/server"
import { NextRequest, NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { db, documents, leads, partnerClients } from "@repo/db"
import { getPartnerRecordForAuthenticatedUser } from "@/lib/partner-record"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = await currentUser()
  const partner = await getPartnerRecordForAuthenticatedUser({ userId, email: user?.email })
  if (!partner) return NextResponse.json({ error: "Partner record not found." }, { status: 404 })

  const { id } = await params
  const [document] = await db.select().from(documents).where(eq(documents.id, id)).limit(1)
  if (!document?.fileDataBase64) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 })
  }

  let allowed = document.ownerType === "partner" && document.ownerId === partner.id

  if (!allowed && document.ownerType === "lead") {
    const [lead] = await db
      .select({ id: leads.id })
      .from(leads)
      .where(and(eq(leads.id, document.ownerId), eq(leads.partnerId, partner.id)))
      .limit(1)
    allowed = Boolean(lead)
  }

  if (!allowed && document.ownerType === "partner_client") {
    const [client] = await db
      .select({ id: partnerClients.id })
      .from(partnerClients)
      .where(and(eq(partnerClients.id, document.ownerId), eq(partnerClients.partnerId, partner.id)))
      .limit(1)
    allowed = Boolean(client)
  }

  if (!allowed) return NextResponse.json({ error: "Document not found." }, { status: 404 })

  const bytes = Buffer.from(document.fileDataBase64, "base64")
  const disposition = request.nextUrl.searchParams.get("disposition") === "inline" ? "inline" : "attachment"

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": document.mimeType || "application/octet-stream",
      "Content-Disposition": `${disposition}; filename="${document.fileName.replace(/"/g, "")}"`,
    },
  })
}