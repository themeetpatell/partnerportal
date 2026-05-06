import { NextRequest, NextResponse } from "next/server"
import { auth } from "@repo/auth/server"
import { db, invoices, leads, logActivity } from "@repo/db"
import { and, count, eq, inArray, isNull } from "drizzle-orm"
import { rateLimit } from "@repo/auth"
import { getActorName, getActiveTeamMember } from "@/lib/admin-auth"
import { getRequiredTenantId } from "@/lib/env"
import { hasAnyTeamRole, FINANCE_ROLES } from "@/lib/rbac"
import { isPartnerReadable, resolvePartnerScopeForActor } from "@/lib/row-scope"

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const limited = rateLimit(`admin-invoices:create:${userId}`, 20, 60_000)
  if (limited) return limited

  const actorName = await getActorName()
  const member = await getActiveTeamMember(userId)
  const tenantId = getRequiredTenantId()

  // Finance and admin only
  if (!member || !hasAnyTeamRole(member.role, FINANCE_ROLES)) {
    return NextResponse.json({ error: "Forbidden — Finance/Admin only" }, { status: 403 })
  }

  const body = await req.json()
  const {
    partnerId,
    serviceRequestId,
    relatedLeadIds,
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

  let relatedLeadIdsJson: string | null = null
  if (Array.isArray(relatedLeadIds) && relatedLeadIds.length > 0) {
    const ids = relatedLeadIds.filter((x: unknown) => typeof x === "string") as string[]
    if (ids.length !== relatedLeadIds.length) {
      return NextResponse.json({ error: "relatedLeadIds must be an array of strings" }, { status: 400 })
    }
    const leadRows = await db
      .select({ id: leads.id })
      .from(leads)
      .where(
        and(
          eq(leads.tenantId, tenantId),
          eq(leads.partnerId, partnerId),
          isNull(leads.deletedAt),
          inArray(leads.id, ids),
        ),
      )
    if (leadRows.length !== ids.length) {
      return NextResponse.json(
        { error: "One or more selected leads are invalid for this partner." },
        { status: 400 },
      )
    }
    relatedLeadIdsJson = JSON.stringify(ids)
  }

  if (!partnerId || !periodStart || !periodEnd || subtotal == null || !dueDate) {
    return NextResponse.json(
      { error: "partnerId, periodStart, periodEnd, subtotal, dueDate are required" },
      { status: 400 }
    )
  }

  const scope = await resolvePartnerScopeForActor({
    tenantId,
    actorUserId: userId,
    member,
  })
  if (!isPartnerReadable(scope, partnerId)) {
    return NextResponse.json(
      { error: "Forbidden — partner is outside your row scope" },
      { status: 403 },
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
      relatedLeadIds: relatedLeadIdsJson,
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
