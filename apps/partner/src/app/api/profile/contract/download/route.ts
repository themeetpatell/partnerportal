import { auth } from "@clerk/nextjs/server"
import { NextRequest, NextResponse } from "next/server"
import { and, desc, eq } from "drizzle-orm"
import { db, documents, partners } from "@repo/db"

export async function GET(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const [partner] = await db
    .select({ id: partners.id })
    .from(partners)
    .where(eq(partners.clerkUserId, userId))
    .limit(1)

  if (!partner) {
    return NextResponse.json({ error: "Partner record not found." }, { status: 404 })
  }

  const [document] = await db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.ownerType, "partner"),
        eq(documents.ownerId, partner.id),
        eq(documents.documentType, "signed_agreement_pdf")
      )
    )
    .orderBy(desc(documents.uploadedAt))
    .limit(1)

  if (!document) {
    return NextResponse.json({ error: "Signed agreement not found." }, { status: 404 })
  }

  if (document.storageProvider === "database" && document.fileDataBase64) {
    const bytes = Buffer.from(document.fileDataBase64, "base64")
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": document.mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${document.fileName}"`,
      },
    })
  }

  return NextResponse.redirect(new URL(document.zohoWorkdriveUrl, request.url))
}
