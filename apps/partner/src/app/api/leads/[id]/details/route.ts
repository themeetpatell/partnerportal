import { NextRequest, NextResponse } from "next/server"
import { rateLimit } from "@repo/auth"
import { db, leads } from "@repo/db"
import { and, eq, isNull } from "drizzle-orm"
import { isPaymentRecurringSlug } from "@repo/types"
import { getCurrentPartnerRecord } from "@/lib/partner-record"

function toNullableString(value: unknown) {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function parseNumericString(value: unknown) {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (!trimmed) return null
  const num = Number(trimmed.replace(/,/g, ""))
  return Number.isFinite(num) ? String(num) : null
}

function parseServiceInterestFromForm(formData: FormData, fallbackRaw: string) {
  const selected = formData
    .getAll("serviceInterestMulti")
    .flatMap((entry) => (typeof entry === "string" ? [entry.trim()] : []))
    .filter(Boolean)

  const custom = (formData.get("serviceInterestCustom") as string | null)
    ?.split(/[\n,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean) ?? []

  const combined = [...new Set([...selected, ...custom])]
  if (combined.length > 0) return JSON.stringify(combined)
  return fallbackRaw
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const partner = await getCurrentPartnerRecord()
  if (!partner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const limited = rateLimit(`partner-lead-details:${partner.id}`, 30, 60_000)
  if (limited) return limited

  const { id } = await params
  const formData = await req.formData()
  const body = Object.fromEntries(formData.entries())

  const [lead] = await db
    .select()
    .from(leads)
    .where(
      and(
        eq(leads.id, id),
        eq(leads.partnerId, partner.id),
        isNull(leads.deletedAt),
      ),
    )
    .limit(1)

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 })
  }

  const hasField = (name: string) => formData.has(name)
  const readStringField = (name: string, fallback: string | null) =>
    hasField(name) ? toNullableString(body[name]) : fallback
  const readNumericField = (name: string, fallback: string | null) =>
    hasField(name) ? parseNumericString(body[name]) : fallback

  const readPaymentRecurring = () => {
    if (!hasField("paymentRecurring")) return lead.paymentRecurring
    const raw = typeof body.paymentRecurring === "string" ? body.paymentRecurring.trim() : ""
    if (raw === "") return null
    if (!isPaymentRecurringSlug(raw)) return lead.paymentRecurring
    return raw
  }

  const customerEmail = readStringField("customerEmail", lead.customerEmail)
  if (!customerEmail) {
    return NextResponse.json(
      { error: "Customer email is required" },
      { status: 422 },
    )
  }

  const firstName = readStringField("firstName", lead.firstName)
  const lastName = readStringField("lastName", lead.lastName)
  const fallbackName =
    readStringField("customerName", lead.customerName) ?? lead.customerName
  const customerName =
    [firstName, lastName].filter(Boolean).join(" ").trim() || fallbackName

  const serviceInterest =
    hasField("serviceInterestMulti") || hasField("serviceInterestCustom")
      ? parseServiceInterestFromForm(formData, lead.serviceInterest)
      : lead.serviceInterest

  const now = new Date()
  const [updatedLead] = await db
    .update(leads)
    .set({
      customerName,
      firstName,
      lastName,
      customerEmail,
      customerPhone: readStringField("customerPhone", lead.customerPhone),
      customerCompany: readStringField("customerCompany", lead.customerCompany),
      source: readStringField("source", lead.source),
      channel: readStringField("channel", lead.channel),
      country: readStringField("country", lead.country),
      city: readStringField("city", lead.city),
      serviceInterest,
      notes: readStringField("notes", lead.notes),
      industry: readStringField("industry", lead.industry),
      businessInUae: readStringField("businessInUae", lead.businessInUae),
      transactionBand: readStringField("transactionBand", lead.transactionBand),
      businessArBand: readStringField("businessArBand", lead.businessArBand),
      decisionRole: readStringField("decisionRole", lead.decisionRole),
      urgencyTimeline: readStringField("urgencyTimeline", lead.urgencyTimeline),
      budgetAmount: readNumericField("budgetAmount", lead.budgetAmount),
      proposalSummary: readStringField("proposalSummary", lead.proposalSummary),
      proposalAmount: readNumericField("proposalAmount", lead.proposalAmount),
      paymentStatus: readStringField("paymentStatus", lead.paymentStatus),
      paymentReference: readStringField("paymentReference", lead.paymentReference),
      paymentAmount: readNumericField("paymentAmount", lead.paymentAmount),
      paymentRecurring: readPaymentRecurring(),
      stageNotes: readStringField("stageNotes", lead.stageNotes),
      lostReason: readStringField("lostReason", lead.lostReason),
      rejectionReason: hasField("lostReason")
        ? toNullableString(body.lostReason)
        : readStringField("rejectionReason", lead.rejectionReason),
      updatedAt: now,
    })
    .where(eq(leads.id, id))
    .returning()

  const redirectTo =
    new URL(req.url).searchParams.get("redirectTo") || `/dashboard/leads/${id}`
  const redirectUrl = new URL(redirectTo, req.url)
  redirectUrl.searchParams.set("save", "ok")

  if ((req.headers.get("accept") || "").includes("text/html")) {
    return NextResponse.redirect(redirectUrl)
  }

  return NextResponse.json({ success: true, lead: updatedLead })
}
