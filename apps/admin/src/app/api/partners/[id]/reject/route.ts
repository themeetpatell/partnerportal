import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db, partners } from "@repo/db"
import { eq } from "drizzle-orm"
import { sendPartnerRejectedEmail } from "@repo/notifications"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  let reason: string | undefined
  const contentType = req.headers.get("content-type") ?? ""
  try {
    if (contentType.includes("application/json")) {
      const body = await req.json()
      reason = typeof body?.reason === "string" ? body.reason : undefined
    } else {
      const form = await req.formData()
      const r = form.get("reason")
      reason = typeof r === "string" && r ? r : undefined
    }
  } catch {
    // reason is optional
  }

  const [updated] = await db
    .update(partners)
    .set({
      status: "rejected",
      rejectionReason: reason ?? null,
      updatedAt: new Date(),
    })
    .where(eq(partners.id, id))
    .returning()

  if (!updated) {
    return NextResponse.json({ error: "Partner not found" }, { status: 404 })
  }

  await sendPartnerRejectedEmail(
    updated.email,
    updated.contactName,
    updated.rejectionReason
  )

  return NextResponse.redirect(new URL(`/partners/${id}`, req.url))
}
