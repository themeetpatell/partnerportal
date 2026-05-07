import { db, getLeadCatalogNameList, leadQuotes, leads, documents, teamMembers } from "@repo/db"
import { and, asc, desc, eq, isNull } from "drizzle-orm"
import {
  isPricingEngineIntegrationsEnabled,
  partnerLeadMayCreatePricingQuote,
} from "@repo/pricing-integration"
import Link from "next/link"
import { notFound } from "next/navigation"
import { z } from "zod"
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Calendar,
  CircleDollarSign,
  ExternalLink,
  FileText,
  MapPin,
  User,
} from "lucide-react"
import { getCurrentPartnerRecord } from "@/lib/partner-record"
import {
  LEAD_DETAIL_PROGRESS_STEPS,
  mergeLeadServiceOptionsWithStored,
  mergeLeadContactNamesForDisplay,
  LEAD_TRANSACTION_BANDS,
  LEAD_BUSINESS_AR_BANDS,
  LEAD_DECISION_ROLES,
  LEAD_URGENCY_TIMELINES,
  LEAD_LOST_REASONS,
  LEAD_INDUSTRY_OPTIONS,
  PAYMENT_RECURRING_OPTIONS,
  COUNTRY_OPTIONS,
  leadSelectOptions,
} from "@repo/types"
import type { LeadStatus } from "@repo/types"
import { LeadEditCard, type LeadFieldDef } from "@/components/lead-edit-card"
import { PartnerLeadPricingSection } from "@/components/lead-pricing-section"

export const dynamic = "force-dynamic"

const statusStyles: Record<string, string> = {
  submitted: "border border-border bg-secondary text-foreground/90",
  lead_approved: "border border-sky-500/25 bg-sky-500/10 text-sky-700 dark:border-sky-400/20 dark:text-sky-100",
  lead_follow_up: "border border-cyan-500/25 bg-cyan-500/10 text-cyan-700 dark:border-cyan-400/20 dark:text-cyan-100",
  lead_qualified: "border border-indigo-500/25 bg-indigo-500/10 text-indigo-700 dark:border-indigo-400/20 dark:text-indigo-100",
  proposal_sent: "border border-primary/20 bg-primary/10 text-primary",
  deal_won: "border border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/20 dark:text-emerald-100",
  deal_lost: "border border-border bg-secondary/60 text-muted-foreground",
}

function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed)
      ? parsed.filter((s): s is string => typeof s === "string" && s.trim().length > 0)
      : []
  } catch {
    return []
  }
}

function formatDateTime(date: Date | string | null | undefined) {
  if (date == null) return "—"
  const d = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("en-AE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

export default async function LeadDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ save?: string }>
}) {
  const { id } = await params
  if (!z.string().uuid().safeParse(id).success) {
    notFound()
  }

  const query = await searchParams
  const partner = await getCurrentPartnerRecord()

  if (!partner) notFound()

  const [[lead], leadDocs, partnerTeamRows, catalogNames, leadQuoteRows] = await Promise.all([
    db
      .select()
      .from(leads)
      .where(and(eq(leads.id, id), eq(leads.partnerId, partner.id), isNull(leads.deletedAt)))
      .limit(1),
    db
      .select()
      .from(documents)
      .where(and(eq(documents.ownerType, "lead"), eq(documents.ownerId, id))),
    db
      .select({ id: teamMembers.id, name: teamMembers.name, role: teamMembers.role })
      .from(teamMembers)
      .where(and(eq(teamMembers.tenantId, partner.tenantId), eq(teamMembers.isActive, true)))
      .orderBy(asc(teamMembers.name)),
    getLeadCatalogNameList(partner.tenantId),
    db
      .select()
      .from(leadQuotes)
      .where(and(eq(leadQuotes.leadId, id), isNull(leadQuotes.deletedAt)))
      .orderBy(desc(leadQuotes.updatedAt)),
  ])

  if (!lead) notFound()

  const services = parseJsonArray(lead.serviceInterest)

  const pipelineStatus = lead.status as LeadStatus
  const currentStep = LEAD_DETAIL_PROGRESS_STEPS.indexOf(
    pipelineStatus as (typeof LEAD_DETAIL_PROGRESS_STEPS)[number],
  )
  const isLost = pipelineStatus === "deal_lost"
  const isWon = pipelineStatus === "deal_won"

  const pricingIntegrationsEnabled = isPricingEngineIntegrationsEnabled()
  const partnerMayCreateQuotes =
    partnerLeadMayCreatePricingQuote(lead.status) && !isLost && !isWon
  const saveBanner =
    query.save === "ok"
      ? "Lead details updated."
      : null

  const serviceOptions =
    catalogNames.length > 0
      ? mergeLeadServiceOptionsWithStored(services, catalogNames)
      : mergeLeadServiceOptionsWithStored(services)

  const partnerPm = partner.partnershipManagerTeamMemberId
    ? partnerTeamRows.find((row) => row.id === partner.partnershipManagerTeamMemberId) ?? null
    : null
  const partnerSdr = partner.sdrTeamMemberId
    ? partnerTeamRows.find((row) => row.id === partner.sdrTeamMemberId) ?? null
    : null
  const partnerProfileUserOption = (row: typeof partnerTeamRows[number] | null) =>
    row
      ? [{ label: `${row.name} (${row.role.replace(/_/g, " ")})`, value: row.id }]
      : []

  const contactNames = mergeLeadContactNamesForDisplay(lead)

  const contactCompanyFields: readonly LeadFieldDef[] = [
    { kind: "text", name: "firstName", label: "First name" },
    { kind: "text", name: "lastName", label: "Last name" },
    { kind: "email", name: "customerEmail", label: "Email", required: true },
    { kind: "tel", name: "customerPhone", label: "Phone" },
    { kind: "text", name: "customerCompany", label: "Company", colSpan: 2 },
    { kind: "multiselect", name: "serviceInterestMulti", label: "Services of interest", options: serviceOptions, colSpan: 2 },
    { kind: "textarea", name: "serviceInterestCustom", label: "Additional services (comma or newline separated)", rows: 2, colSpan: 2 },
    { kind: "file", name: "tradeLicenseFile", label: "Trade license upload", accept: ".pdf,.png,.jpg,.jpeg", colSpan: 2 },
    { kind: "textarea", name: "notes", label: "Notes", rows: 3, colSpan: 2 },
    { kind: "readonlyDate", name: "createdAt", label: "Submitted" },
  ]
  const contactCompanyInitial = {
    firstName: contactNames.firstName,
    lastName: contactNames.lastName,
    customerEmail: lead.customerEmail,
    customerPhone: lead.customerPhone,
    customerCompany: lead.customerCompany,
    serviceInterestMulti: services,
    serviceInterestCustom: null,
    tradeLicenseFile: null,
    notes: lead.notes,
    createdAt:
      lead.createdAt instanceof Date ? lead.createdAt.toISOString() : lead.createdAt,
  }

  const sourceRegionFields: readonly LeadFieldDef[] = [
    { kind: "readonlyText", name: "source", label: "Source" },
    {
      kind: "select",
      name: "country",
      label: "Country",
      options: leadSelectOptions([...COUNTRY_OPTIONS]),
      placeholder: "Select country",
    },
    { kind: "text", name: "city", label: "City" },
  ]
  const sourceRegionInitial = {
    source: lead.source,
    country: lead.country,
    city: lead.city,
  }

  const ownershipFields: readonly LeadFieldDef[] = [
    { kind: "text", name: "leadOwner", label: "Lead owner" },
    { kind: "text", name: "dealOwner", label: "Deal owner" },
    {
      kind: "select",
      name: "partnershipManagerTeamMemberId",
      label: "Partnership manager",
      options: partnerProfileUserOption(partnerPm),
      placeholder: "Select partnership manager",
    },
    {
      kind: "select",
      name: "sdrTeamMemberId",
      label: "Partnership executive",
      options: partnerProfileUserOption(partnerSdr),
      placeholder: "Select partnership executive",
    },
  ]
  const ownershipInitial = {
    leadOwner: lead.leadOwner,
    dealOwner: lead.dealOwner,
    partnershipManagerTeamMemberId: partnerPm?.id ?? null,
    sdrTeamMemberId: partnerSdr?.id ?? null,
  }

  const qualificationFields: readonly LeadFieldDef[] = [
    {
      kind: "select",
      name: "industry",
      label: "Industry",
      options: leadSelectOptions([...LEAD_INDUSTRY_OPTIONS]),
      placeholder: "Select industry",
      colSpan: 2,
    },
    {
      kind: "select",
      name: "businessInUae",
      label: "Business in UAE?",
      options: [
        { label: "Yes", value: "yes" },
        { label: "No", value: "no" },
      ],
    },
    {
      kind: "select",
      name: "transactionBand",
      label: "Transactions / month",
      options: leadSelectOptions([...LEAD_TRANSACTION_BANDS]),
    },
    {
      kind: "select",
      name: "businessArBand",
      label: "Business AR (AED)",
      options: leadSelectOptions([...LEAD_BUSINESS_AR_BANDS]),
    },
    {
      kind: "select",
      name: "decisionRole",
      label: "Decision role",
      options: leadSelectOptions([...LEAD_DECISION_ROLES]),
    },
    {
      kind: "select",
      name: "urgencyTimeline",
      label: "Urgency timeline",
      options: leadSelectOptions([...LEAD_URGENCY_TIMELINES]),
    },
    { kind: "number", name: "budgetAmount", label: "Budget (AED)", colSpan: 2 },
  ]
  const qualificationInitial = {
    industry: lead.industry,
    businessInUae: lead.businessInUae,
    transactionBand: lead.transactionBand,
    businessArBand: lead.businessArBand,
    decisionRole: lead.decisionRole,
    urgencyTimeline: lead.urgencyTimeline,
    budgetAmount: lead.budgetAmount,
  }

  const pipelineFields: readonly LeadFieldDef[] = [
    { kind: "textarea", name: "proposalSummary", label: "Proposal summary", rows: 2, colSpan: 2 },
    { kind: "number", name: "proposalAmount", label: "Proposal amount (AED)" },
    {
      kind: "select",
      name: "paymentStatus",
      label: "Payment status",
      options: [
        { label: "Paid", value: "paid" },
        { label: "Unpaid", value: "unpaid" },
        { label: "Partially paid", value: "partially_paid" },
      ],
      placeholder: "Select payment status",
    },
    { kind: "text", name: "paymentReference", label: "Payment reference" },
    { kind: "number", name: "paymentAmount", label: "Payment amount (AED)" },
    {
      kind: "select",
      name: "paymentRecurring",
      label: "Payment recurring?",
      options: [...PAYMENT_RECURRING_OPTIONS],
      placeholder: "None (one-time)",
      colSpan: 2,
    },
    { kind: "textarea", name: "stageNotes", label: "Stage notes", rows: 2, colSpan: 2 },
    {
      kind: "select",
      name: "lostReason",
      label: "Lost reason",
      options: leadSelectOptions([...LEAD_LOST_REASONS]),
      colSpan: 2,
    },
    { kind: "readonlyDate", name: "approvedAt", label: "Approved at" },
    { kind: "readonlyDate", name: "stageUpdatedAt", label: "Stage updated at" },
    { kind: "readonlyDate", name: "proposalSentAt", label: "Proposal sent at" },
    { kind: "readonlyDate", name: "paymentDate", label: "Payment date" },
    { kind: "readonlyDate", name: "convertedAt", label: "Converted at" },
  ]
  const toIso = (d: Date | string | null | undefined) =>
    d instanceof Date ? d.toISOString() : d ?? null
  const pipelineInitial = {
    proposalSummary: lead.proposalSummary,
    proposalAmount: lead.proposalAmount,
    paymentStatus: lead.paymentStatus,
    paymentReference: lead.paymentReference,
    paymentAmount: lead.paymentAmount,
    paymentRecurring: lead.paymentRecurring,
    stageNotes: lead.stageNotes,
    lostReason: lead.lostReason ?? lead.rejectionReason,
    approvedAt: toIso(lead.approvedAt),
    stageUpdatedAt: toIso(lead.stageUpdatedAt),
    proposalSentAt: toIso(lead.proposalSentAt),
    paymentDate: toIso(lead.paymentDate),
    convertedAt: toIso(lead.convertedAt),
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="surface-card rounded-[2rem] px-6 py-7 sm:px-8">
        <Link
          href="/dashboard/leads"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to leads
        </Link>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="page-title">{lead.customerName}</h1>
            {lead.customerCompany ? (
              <p className="mt-1 text-base text-muted-foreground">{lead.customerCompany}</p>
            ) : null}
            <p className="mt-1 text-xs text-muted-foreground/60">Lead ID: {lead.id}</p>
          </div>
          <span
            className={`status-pill self-start text-sm ${statusStyles[lead.status] ?? "border border-border bg-secondary/70 text-[var(--portal-text-soft)]"}`}
          >
            {lead.status.replace(/_/g, " ")}
          </span>
        </div>

        {/* Progress timeline — same steps as admin + `LEAD_DETAIL_PROGRESS_STEPS` in @repo/types */}
        <div className="mt-6 flex items-center">
          {LEAD_DETAIL_PROGRESS_STEPS.map((step, i) => {
            const done = isWon ? true : !isLost && i < currentStep
            const current = !isLost && i === currentStep
            return (
              <div key={step} className="flex flex-1 items-center last:flex-none">
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                      done && !current
                        ? "bg-emerald-500 text-foreground"
                        : current
                          ? "bg-indigo-500 text-foreground ring-2 ring-indigo-400/40 ring-offset-1 ring-offset-transparent"
                          : "border border-border bg-secondary/50 text-muted-foreground/60"
                    }`}
                  >
                    {done && !current ? "✓" : i + 1}
                  </div>
                  <span className={`hidden text-[11px] sm:block ${current ? "text-primary" : done ? "text-muted-foreground" : "text-muted-foreground/60"}`}>
                    {step.replace(/_/g, " ")}
                  </span>
                </div>
                {i < LEAD_DETAIL_PROGRESS_STEPS.length - 1 ? (
                  <div
                    className={`h-px flex-1 ${
                      isWon || (!isLost && i < currentStep) ? "bg-emerald-600/50" : "bg-secondary"
                    }`}
                  />
                ) : null}
              </div>
            )
          })}
          {isLost ? (
            <div className="ml-3 flex flex-col items-center gap-1.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full border border-rose-700/50 bg-rose-500/10 text-xs font-bold text-rose-400">
                ✕
              </div>
              <span className="hidden text-[11px] text-rose-400 sm:block">Deal lost</span>
            </div>
          ) : null}
        </div>

        {isLost && lead.rejectionReason ? (
          <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/8 px-4 py-3 text-sm text-rose-200">
            Rejection reason: {lead.rejectionReason}
          </div>
        ) : null}
        {saveBanner ? (
          <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {saveBanner}
          </div>
        ) : null}
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left — main details */}
        <div className="space-y-6 lg:col-span-2">
          {/* Customer info */}
          <section className="surface-card rounded-[2rem] px-6 py-6">
            <LeadEditCard
              leadId={lead.id}
              title="Contact & Company"
              icon={<User className="h-4 w-4" />}
              canEdit
              fields={contactCompanyFields}
              initialValues={contactCompanyInitial}
            />
          </section>

          <section className="surface-card rounded-[2rem] px-6 py-6">
            <LeadEditCard
              leadId={lead.id}
              title="Source & Region"
              icon={<MapPin className="h-4 w-4" />}
              canEdit
              fields={sourceRegionFields}
              initialValues={sourceRegionInitial}
            />
          </section>

          <section className="surface-card rounded-[2rem] px-6 py-6">
            <LeadEditCard
              leadId={lead.id}
              title="Team & ownership"
              icon={<Building2 className="h-4 w-4" />}
              canEdit={false}
              fields={ownershipFields}
              initialValues={ownershipInitial}
            />
          </section>

          <section className="surface-card rounded-[2rem] px-6 py-6">
            <LeadEditCard
              leadId={lead.id}
              title="Qualification"
              icon={<Briefcase className="h-4 w-4" />}
              canEdit={false}
              fields={qualificationFields}
              initialValues={qualificationInitial}
            />
          </section>

          <section className="surface-card rounded-[2rem] px-6 py-6">
            <LeadEditCard
              leadId={lead.id}
              title="Pipeline & proposal"
              icon={<CircleDollarSign className="h-4 w-4" />}
              canEdit={false}
              fields={pipelineFields}
              initialValues={pipelineInitial}
            />
          </section>

          <PartnerLeadPricingSection
            leadId={lead.id}
            quotes={leadQuoteRows}
            canCreate={partnerMayCreateQuotes}
            integrationsEnabled={pricingIntegrationsEnabled}
          />

          {/* Documents */}
          <section className="surface-card rounded-[2rem] px-6 py-6">
            <h2 className="flex items-center gap-2 font-heading text-lg font-semibold text-foreground">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Documents
            </h2>
            {leadDocs.length === 0 ? (
              <p className="mt-4 text-center text-sm text-muted-foreground">No documents attached.</p>
            ) : (
              <div className="mt-4 space-y-2">
                {leadDocs.map((doc) => (
                  <a
                    key={doc.id}
                    href={doc.zohoWorkdriveUrl ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-3 rounded-xl border border-border bg-secondary/50 p-3 transition-colors hover:bg-secondary/80"
                  >
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{doc.fileName}</p>
                      <p className="text-xs capitalize text-muted-foreground">{doc.documentType}</p>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60 transition-colors group-hover:text-muted-foreground" />
                  </a>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Key dates */}
          <section className="surface-card rounded-[2rem] px-6 py-6">
            <h2 className="flex items-center gap-2 font-heading text-lg font-semibold text-foreground">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Key dates
            </h2>
            <dl className="mt-4 space-y-3">
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Submitted</dt>
                <dd className="mt-1 text-sm text-foreground">{formatDateTime(lead.createdAt)}</dd>
              </div>
              {lead.convertedAt ? (
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-500">Deal won</dt>
                  <dd className="mt-1 text-sm text-foreground">{formatDateTime(lead.convertedAt)}</dd>
                </div>
              ) : null}
              {lead.proposalSentAt ? (
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Proposal sent</dt>
                  <dd className="mt-1 text-sm text-foreground">
                    {formatDateTime(lead.proposalSentAt)}
                  </dd>
                </div>
              ) : null}
            </dl>
          </section>

          {/* Next steps for won leads */}
          {lead.status === "deal_won" ? (
            <section className="surface-card rounded-[2rem] px-6 py-6">
              <h2 className="font-heading text-lg font-semibold text-foreground">Next steps</h2>
              <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                Won it—now milk it: service request or another lead.
              </p>
              <div className="mt-4 flex flex-col gap-2">
                <Link href="/dashboard/leads/new?leadType=existing" className="primary-button justify-center">
                  Create service request
                </Link>
                <Link
                  href={`/dashboard/leads/new?company=${encodeURIComponent(lead.customerCompany ?? "")}&contactName=${encodeURIComponent(lead.customerName)}&email=${encodeURIComponent(lead.customerEmail)}`}
                  className="secondary-button justify-center"
                >
                  Submit another lead
                </Link>
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  )
}
