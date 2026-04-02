import { auth } from "@clerk/nextjs/server"
import { NextRequest, NextResponse } from "next/server"
import { db, documents } from "@repo/db"
import { eq } from "drizzle-orm"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  const [document] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, id))
    .limit(1)

  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 })
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

  return NextResponse.redirect(document.zohoWorkdriveUrl)
}
