import { NextRequest, NextResponse } from "next/server"
import { redirect } from "next/navigation"
import { auth } from "@repo/auth/server"
import { db, leads, partners } from "@repo/db"
import { eq, and, isNull } from "drizzle-orm"
import { createZohoLead, normalizeZohoLeadServices } from "@repo/zoho"
import { getActiveTeamMember } from "@/lib/admin-auth"
import { hasAnyTeamRole } from "@/lib/rbac"

function splitCustomerName(fullName: string) {
  const trimmed = fullName.trim()
  const parts = trimmed.split(/\s+/)
  if (parts.length === 1) return { firstName: undefined, lastName: parts[0]! }
  return { firstName: parts.slice(0, -1).join(" "), lastName: parts.at(-1)! }
}

function parseServices(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const redirectTo = req.nextUrl.searchParams.get("redirectTo")

  function reply(status: number, result: string, extra?: string) {
    if (redirectTo) {
      const url = `${redirectTo}?pushCrm=${result}${extra ? `&reason=${extra}` : ""}`
      redirect(url)
    }
    return NextResponse.json({ result }, { status })
  }

  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const member = await getActiveTeamMember(userId)
  if (!member || !hasAnyTeamRole(member.role, ["super_admin", "admin", "partnership_manager", "sdr"])) {
    return reply(403, "error", "forbidden")
  }

  const [row] = await db
    .select({ lead: leads, partner: partners })
    .from(leads)
    .innerJoin(partners, eq(partners.id, leads.partnerId))
    .where(and(eq(leads.id, id), isNull(leads.deletedAt)))
    .limit(1)

  if (!row) return reply(404, "error", "not_found")

  if (row.lead.zohoLeadId) return reply(409, "already_synced")

  const serviceInterest = parseServices(row.lead.serviceInterest)
  const zohoServices = normalizeZohoLeadServices(serviceInterest)
  const { firstName, lastName } = splitCustomerName(row.lead.customerName)

  const result = await createZohoLead({
    First_Name: firstName,
    Last_Name: lastName,
    Email: row.lead.customerEmail,
    Phone: row.lead.customerPhone ?? undefined,
    Company: row.lead.customerCompany || row.lead.customerName,
    Lead_Source: "Partner Portal",
    Lead_Status: "New (Incoming)",
    Services_List: zohoServices.length > 0 ? zohoServices : undefined,
    Description: [
      `Submitted via partner portal by ${row.partner.contactName} (${row.partner.companyName}).`,
      serviceInterest.length > 0 ? `Services interested: ${serviceInterest.join(", ")}` : null,
      row.lead.notes ? `Notes: ${row.lead.notes}` : null,
    ].filter(Boolean).join("\n"),
  })

  if ("error" in result) {
    console.error("[push-to-crm] Zoho rejected lead", id, result.error)
    return reply(502, "error", `crm_rejected:${result.error}`)
  }

  await db.update(leads).set({ zohoLeadId: result.id, updatedAt: new Date() }).where(eq(leads.id, id))

  return reply(200, "ok")
}
