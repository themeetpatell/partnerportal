import { NextRequest, NextResponse } from "next/server"
import { auth, currentUser } from "@clerk/nextjs/server"
import { db, invoices, teamMembers, logActivity } from "@repo/db"
import { and, eq, sql } from "drizzle-orm"

const TENANT_ID = process.env.DEFAULT_TENANT_ID!

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = await currentUser()
  const actorName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.emailAddresses[0]?.emailAddress ||
    "Admin"

  // Finance and admin only
  const [member] = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.clerkUserId, userId), eq(teamMembers.isActive, true)))
    .limit(1)

  if (member && !["admin", "finance"].includes(member.role)) {
    return NextResponse.json({ error: "Forbidden — Finance/Admin only" }, { status: 403 })
  }

  const body = await req.json()
  const {
    partnerId,
    serviceRequestId,
    periodStart,
    periodEnd,
    subtotal,
    discount = 0,
    tax = 0,
    currency = "AED",
    paymentTerms,
    paymentNotes,
    dueDate,
    status = "draft",
  } = body

  if (!partnerId || !periodStart || !periodEnd || subtotal == null || !dueDate) {
    return NextResponse.json(
      { error: "partnerId, periodStart, periodEnd, subtotal, dueDate are required" },
      { status: 400 }
    )
  }

  const total = Number(subtotal) - Number(discount) + Number(tax)

  // Generate sequential invoice number
  const [numRow] = await db.execute(
    sql`SELECT COUNT(*) AS cnt FROM invoices WHERE tenant_id = ${TENANT_ID}`
  )
  const seq = Number((numRow as { cnt: string }).cnt) + 1
  const invoiceNumber = `INV-${String(seq).padStart(5, "0")}`

  const [created] = await db
    .insert(invoices)
    .values({
      tenantId: TENANT_ID,
      partnerId,
      serviceRequestId: serviceRequestId || null,
      invoiceNumber,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      subtotal: String(subtotal),
      discount: String(discount),
      tax: String(tax),
      total: String(total),
      currency,
      status,
      paymentTerms: paymentTerms || null,
      paymentNotes: paymentNotes || null,
      dueDate: new Date(dueDate),
      issuedAt: status === "sent" ? new Date() : null,
      createdBy: userId,
    })
    .returning()

  await logActivity({
    tenantId: TENANT_ID,
    entityType: "invoice",
    entityId: created!.id,
    actorId: userId,
    actorName,
    action: "created",
    note: `Invoice ${invoiceNumber} created by ${actorName}. Status: ${status}`,
    metadata: { total, currency },
  })

  return NextResponse.json(created, { status: 201 })
}
