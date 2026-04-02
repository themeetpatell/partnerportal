import { NextRequest, NextResponse } from "next/server"
import { auth } from "@repo/auth/server"
import { db, invoices, logActivity } from "@repo/db"
import { and, count, eq, isNull } from "drizzle-orm"
import { rateLimit } from "@repo/auth"
import { getActorName, getActiveTeamMember } from "@/lib/admin-auth"
import { getRequiredTenantId } from "@/lib/env"
import { hasAnyTeamRole } from "@/lib/rbac"

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const limited = rateLimit(`admin-invoices:create:${userId}`, 20, 60_000)
  if (limited) return limited

  const actorName = await getActorName()
  const member = await getActiveTeamMember(userId)
  const tenantId = getRequiredTenantId()

  // Finance and admin only
  if (!member || !hasAnyTeamRole(member.role, ["super_admin", "admin", "finance"])) {
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
  const [numResult] = await db
    .select({ count: count() })
    .from(invoices)
    .where(and(eq(invoices.tenantId, tenantId), isNull(invoices.deletedAt)))
  const seq = Number(numResult?.count ?? 0) + 1
  const invoiceNumber = `INV-${String(seq).padStart(5, "0")}`

  const [created] = await db
    .insert(invoices)
    .values({
      tenantId,
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
    tenantId,
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
