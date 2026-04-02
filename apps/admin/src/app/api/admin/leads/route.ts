import { NextRequest, NextResponse } from "next/server"
import { auth } from "@repo/auth/server"
import { db, leads, logActivity, partners, services } from "@repo/db"
import { eq, and, or, isNull, inArray } from "drizzle-orm"
import { rateLimit } from "@repo/auth"
import { createZohoLead, normalizeZohoLeadServices } from "@repo/zoho"
import { getActiveTeamMember, getActorName } from "@/lib/admin-auth"
import { getRequiredTenantId } from "@/lib/env"
import { hasAnyTeamRole } from "@/lib/rbac"

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

async function resolveServiceInterestNames(tenantId: string, rawValues: unknown) {
  const cleaned = Array.isArray(rawValues)
    ? rawValues
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter(Boolean)
    : []

  const serviceIds = cleaned.filter((value) => uuidPattern.test(value))
  if (serviceIds.length === 0) {
    return [...new Set(cleaned)]
  }

  const rows = await db
    .select({ id: services.id, name: services.name })
    .from(services)
    .where(and(eq(services.tenantId, tenantId), inArray(services.id, serviceIds)))

  const serviceNameById = new Map(rows.map((row) => [row.id, row.name]))
  return [
    ...new Set(cleaned.map((value) => serviceNameById.get(value) ?? value)),
  ]
}

function splitCustomerName(fullName: string) {
  const trimmed = fullName.trim()
  if (!trimmed) {
    return { firstName: undefined, lastName: "Unknown" }
  }

  const parts = trimmed.split(/\s+/)
  if (parts.length === 1) {
    return { firstName: undefined, lastName: parts[0]! }
  }

  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts.at(-1)!,
  }
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const limited = rateLimit(`admin-leads:create:${userId}`, 30, 60_000)
  if (limited) return limited

  const actorName = await getActorName()
  const member = await getActiveTeamMember(userId)

  if (!member || !hasAnyTeamRole(member.role, ["super_admin", "admin", "partnership_manager", "sdr"])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const tenantId = getRequiredTenantId()

  const body = await req.json()
  const {
    partnerId,
    customerName,
    customerEmail,
    customerPhone,
    customerCompany,
    serviceInterest = [],
    notes,
    source = "manual",
    channel,
    region,
    country,
    city,
    assignedTo,
    onBehalfNote,
  } = body

  if (!partnerId || !customerName || !customerEmail) {
    return NextResponse.json(
      { error: "partnerId, customerName, customerEmail are required" },
      { status: 400 }
    )
  }

  if (!onBehalfNote?.trim()) {
    return NextResponse.json(
      { error: "onBehalfNote is required when creating a lead on behalf of a partner" },
      { status: 400 }
    )
  }

  // Duplicate check by email or phone within same partner
  const existing = await db
    .select({ id: leads.id })
    .from(leads)
    .where(
      and(
        eq(leads.partnerId, partnerId),
        eq(leads.tenantId, tenantId),
        isNull(leads.deletedAt),
        or(
          eq(leads.customerEmail, customerEmail),
          customerPhone ? eq(leads.customerPhone, customerPhone) : undefined
        )
      )
    )
    .limit(1)

  if (existing.length > 0) {
    return NextResponse.json(
      { error: "A lead with this email/phone already exists for this partner", duplicateId: existing[0]!.id },
      { status: 409 }
    )
  }

  const [partner] = await db
    .select({
      id: partners.id,
      companyName: partners.companyName,
      contactName: partners.contactName,
    })
    .from(partners)
    .where(and(eq(partners.id, partnerId), eq(partners.tenantId, tenantId)))
    .limit(1)

  if (!partner) {
    return NextResponse.json({ error: "Partner not found" }, { status: 404 })
  }

  const serviceInterestNames = await resolveServiceInterestNames(
    tenantId,
    serviceInterest
  )
  const { firstName, lastName } = splitCustomerName(customerName)
  const zohoServices = normalizeZohoLeadServices(serviceInterestNames)
  const zohoLeadId = await createZohoLead({
    First_Name: firstName,
    Last_Name: lastName,
    Email: customerEmail,
    Phone: customerPhone || undefined,
    Company: customerCompany || customerName,
    Lead_Source: "Manually Added",
    Lead_Status: "New (Incoming)",
    Services_List: zohoServices.length > 0 ? zohoServices : undefined,
    Description: [
      `Created by ${actorName} on behalf of ${partner.contactName} (${partner.companyName}).`,
      `Partner note: ${onBehalfNote.trim()}`,
      serviceInterestNames.length > 0
        ? `Services interested: ${serviceInterestNames.join(", ")}`
        : null,
      notes?.trim() ? `Notes: ${notes.trim()}` : null,
    ]
      .filter(Boolean)
      .join("\n"),
  })

  if (!zohoLeadId) {
    return NextResponse.json(
      { error: "Lead could not be created in Zoho CRM. Please try again." },
      { status: 502 }
    )
  }

  const [created] = await db
    .insert(leads)
    .values({
      tenantId,
      partnerId,
      customerName,
      customerEmail,
      customerPhone: customerPhone || null,
      customerCompany: customerCompany || null,
      serviceInterest: JSON.stringify(serviceInterestNames),
      notes: notes || null,
      status: "submitted",
      source,
      channel: channel || null,
      region: region || null,
      country: country || null,
      city: city || null,
      assignedTo: assignedTo || null,
      createdBy: userId,
      onBehalfNote: onBehalfNote.trim(),
      zohoLeadId,
    })
    .returning()

  await logActivity({
    tenantId,
    entityType: "lead",
    entityId: created!.id,
    actorId: userId,
    actorName,
    action: "created",
    note: `Created by ${actorName} on behalf of partner. Note: ${onBehalfNote.trim()}`,
    metadata: { source, channel },
  })

  return NextResponse.json(created, { status: 201 })
}
