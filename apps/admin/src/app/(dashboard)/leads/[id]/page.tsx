import { notFound } from "next/navigation"
import Link from "next/link"
import { auth, currentUser } from "@repo/auth/server"
import { db, leads, partners, documents, commissions } from "@repo/db"
import { eq, and, or, desc, isNull } from "drizzle-orm"
import {
  ArrowLeft,
  Briefcase,
  Building2,
  CheckCircle,
  CircleDollarSign,
  ExternalLink,
  FileText,
  MapPin,
  User,
} from "lucide-react"
import { getCurrentActiveTeamMember } from "@/lib/admin-auth"
import { getRequiredTenantId } from "@/lib/env"
import { hasAnyTeamRole, FINANCE_ROLES, LEAD_PIPELINE_ROLES } from "@/lib/rbac"
import { isPartnerReadable, resolvePartnerScopeForActor } from "@/lib/row-scope"
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
  leadSelectOptions,
} from "@repo/types"
import type { LeadStatus } from "@repo/types"
import { LeadEditCard, type LeadFieldDef } from "@/components/lead-edit-card"
import { LeadStageActions } from "@/components/lead-stage-actions"

export const dynamic = "force-dynamic"

const COMMISSION_CREATE_ERROR_COPY: Record<string, string> = {
  duplicate: "Deal-close row already here—no double-dip.",
  not_deal_won: "Flip to deal won first.",
  no_basis: "Need a number: payment beats proposal; or type a basis in the form.",
  no_model: "Partner has no commission model—fix in partner profile.",
  no_partner: "Partner record MIA for this lead.",
  forbidden_scope: "That partner is outside your scope.",
  zero_commission: "Math says zero—check tiers/rates.",
  server: "Couldn’t create it—retry?",
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    submitted: "bg-blue-950/60 border-blue-800/40 text-blue-400",
    lead_approved: "bg-sky-950/60 border-sky-800/40 text-sky-400",
    lead_follow_up: "bg-cyan-950/60 border-cyan-800/40 text-cyan-400",
    lead_qualified: "bg-indigo-950/60 border-indigo-800/40 text-indigo-400",
    proposal_sent: "bg-yellow-950/60 border-yellow-800/40 text-yellow-400",
    deal_won: "bg-green-950/60 border-green-800/40 text-green-400",
    deal_lost: "bg-red-950/60 border-red-800/40 text-red-400",
  }
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${map[status] ?? "bg-white/6 border-white/10 text-slate-400"}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  )
}

function formatCurrencyAmount(value: string | null | undefined) {
  if (!value) {
    return null
  }

  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    return value
  }

  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    maximumFractionDigits: 2,
  }).format(parsed)
}

function ApproveLeadForm({
  leadId,
  canApprove,
}: {
  leadId: string
  canApprove: boolean
}) {
  return (
    <form action={`/api/leads/${leadId}/approve?redirectTo=/leads/${leadId}`} method="POST">
      <button
        type="submit"
        disabled={!canApprove}
        aria-disabled={!canApprove}
        title={!canApprove ? "Your role does not have permission to approve leads." : undefined}
        className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
          canApprove
            ? "border border-emerald-800/40 bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/60"
            : "cursor-not-allowed bg-slate-700/70 text-slate-400"
        }`}
      >
        <CheckCircle className="h-4 w-4" />
        Approve lead
      </button>
    </form>
  )
}

export default async function LeadDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{
    status?: string
    next?: string
    reason?: string
    commission?: string
    commissionReason?: string
  }>
}) {
  const [{ id }, query, { userId }] = await Promise.all([params, searchParams, auth()])

  const tenantId = getRequiredTenantId()

  const [[leadRow], leadDocs, member, leadActor, leadCommissions] = await Promise.all([
    db
      .select({ lead: leads, partner: partners })
      .from(leads)
      .leftJoin(partners, eq(partners.id, leads.partnerId))
      .where(and(eq(leads.id, id), eq(leads.tenantId, tenantId), isNull(leads.deletedAt)))
      .limit(1),
    db
      .select()
      .from(documents)
      .where(and(eq(documents.ownerType, "lead"), eq(documents.ownerId, id))),
    userId ? getCurrentActiveTeamMember() : Promise.resolve(null),
    currentUser(),
    db
      .select()
      .from(commissions)
      .where(
        and(
          eq(commissions.tenantId, tenantId),
          or(
            and(eq(commissions.sourceType, "lead"), eq(commissions.sourceId, id)),
            eq(commissions.relatedLeadId, id),
          ),
        ),
      )
      .orderBy(desc(commissions.calculatedAt)),
  ])

  if (!leadRow) notFound()

  const lead = leadRow.lead
  const scope =
    leadActor?.id === undefined
      ? ({ kind: "restricted" as const, partnerIds: [] as readonly string[] })
      : await resolvePartnerScopeForActor({
          tenantId,
          actorUserId: leadActor.id,
          member,
        })
  if (!isPartnerReadable(scope, lead.partnerId)) notFound()

  const partner = leadRow.partner

  const services = (() => {
    try {
      return JSON.parse(lead.serviceInterest) as string[]
    } catch {
      return [lead.serviceInterest]
    }
  })()
  const pipelineStatus = lead.status as LeadStatus
  const currentStep = LEAD_DETAIL_PROGRESS_STEPS.indexOf(
    pipelineStatus as (typeof LEAD_DETAIL_PROGRESS_STEPS)[number],
  )
  const isLost = pipelineStatus === "deal_lost"
  const isWon = pipelineStatus === "deal_won"

  const canManageLeads = member
    ? hasAnyTeamRole(member.role, LEAD_PIPELINE_ROLES)
    : false

  const canManageCommissions = member
    ? hasAnyTeamRole(member.role, FINANCE_ROLES)
    : false

  const hasDealCloseCommission = leadCommissions.some(
    (c) => c.sourceType === "lead" && c.sourceId === id,
  )

  const serviceOptions = mergeLeadServiceOptionsWithStored(services)

  const contactNames = mergeLeadContactNamesForDisplay(lead)

  const contactCompanyFields: readonly LeadFieldDef[] = [
    { kind: "readonlyText", name: "customerNameSummary", label: "Full name" },
    { kind: "text", name: "firstName", label: "First name" },
    { kind: "text", name: "lastName", label: "Last name" },
    { kind: "email", name: "customerEmail", label: "Email", required: true },
    { kind: "tel", name: "customerPhone", label: "Phone" },
    { kind: "text", name: "customerCompany", label: "Company", colSpan: 2 },
    { kind: "multiselect", name: "serviceInterestMulti", label: "Services", options: serviceOptions, colSpan: 2 },
    { kind: "textarea", name: "serviceInterestCustom", label: "Additional services (comma or newline separated)", rows: 2, colSpan: 2 },
    { kind: "textarea", name: "notes", label: "Notes", rows: 3, colSpan: 2 },
    { kind: "readonlyDate", name: "createdAt", label: "Submitted" },
  ]
  const contactCompanyInitial = {
    customerNameSummary: lead.customerName,
    firstName: contactNames.firstName,
    lastName: contactNames.lastName,
    customerEmail: lead.customerEmail,
    customerPhone: lead.customerPhone,
    customerCompany: lead.customerCompany,
    serviceInterestMulti: services,
    serviceInterestCustom: null,
    notes: lead.notes,
    createdAt: lead.createdAt instanceof Date ? lead.createdAt.toISOString() : lead.createdAt,
  }

  const sourceOwnershipFields: readonly LeadFieldDef[] = [
    { kind: "text", name: "source", label: "Source" },
    { kind: "text", name: "channel", label: "Channel" },
    { kind: "text", name: "country", label: "Country" },
    { kind: "text", name: "city", label: "City" },
    { kind: "text", name: "leadOwner", label: "Lead owner" },
    { kind: "text", name: "dealOwner", label: "Deal owner" },
    { kind: "text", name: "partnershipManager", label: "Partnership manager" },
    { kind: "text", name: "appointmentSetter", label: "Appointment setter" },
  ]
  const sourceOwnershipInitial = {
    source: lead.source,
    channel: lead.channel,
    country: lead.country,
    city: lead.city,
    leadOwner: lead.leadOwner,
    dealOwner: lead.dealOwner,
    partnershipManager: lead.partnershipManager,
    appointmentSetter: lead.appointmentSetter,
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
    { kind: "text", name: "paymentStatus", label: "Payment status" },
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

  const approvalBanner =
    query.status === "ok" && query.next === "lead_approved"
      ? {
          tone: "border-emerald-400/16 bg-emerald-500/8 text-emerald-100",
          text: "Lead approved. Pipeline stage updated.",
        }
      : null

  const actionErrorBanner =
    query.status === "error"
      ? {
          tone: "border-rose-400/16 bg-rose-500/8 text-rose-100",
          text:
            query.next === "forbidden"
              ? "Your role does not have permission to perform that action."
              : query.next === "not_found"
                ? "Lead not found."
                : query.next === "invalid_transition"
                  ? "That action is not valid for the current lead status."
                  : "Something went wrong.",
        }
      : null

  const commissionOkBanner =
    query.commission === "ok"
      ? {
          tone: "border-emerald-400/16 bg-emerald-500/8 text-emerald-100",
          text: "Row landed—pending in Commissions.",
        }
      : null

  const commissionErrBanner =
    query.commission === "error" && query.commissionReason
      ? {
          tone: "border-rose-400/16 bg-rose-500/8 text-rose-100",
          text:
            COMMISSION_CREATE_ERROR_COPY[query.commissionReason] ??
            "Could not create commission.",
        }
      : null

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div>
        <Link
          href="/leads"
          className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white text-sm mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Leads
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {lead.customerName}
            </h1>
            <p className="text-slate-400 text-sm mt-1">Lead ID: {lead.id}</p>
          </div>
          <StatusBadge status={lead.status} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {lead.status === "submitted" && lead.source === "partner_portal" ? (
          <ApproveLeadForm leadId={lead.id} canApprove={canManageLeads} />
        ) : null}
        <LeadStageActions
          leadId={lead.id}
          currentStatus={pipelineStatus}
          canManage={canManageLeads}
        />
        {!canManageLeads ? (
          <div className="rounded-lg border border-amber-400/16 bg-amber-500/8 px-3 py-1.5 text-[11px] leading-snug text-amber-100">
            Pipeline controls? You’ll need Admin, Partnership, Pre-sales, Sales, or Ops.
          </div>
        ) : null}
      </div>

      {approvalBanner ? (
        <div className={`rounded-xl border px-3 py-2 text-[11px] leading-snug ${approvalBanner.tone}`}>
          {approvalBanner.text}
        </div>
      ) : null}
      {actionErrorBanner ? (
        <div className={`rounded-xl border px-3 py-2 text-[11px] leading-snug ${actionErrorBanner.tone}`}>
          {actionErrorBanner.text}
        </div>
      ) : null}
      {commissionOkBanner ? (
        <div className={`rounded-xl border px-3 py-2 text-[11px] leading-snug ${commissionOkBanner.tone}`}>
          {commissionOkBanner.text}
        </div>
      ) : null}
      {commissionErrBanner ? (
        <div className={`rounded-xl border px-3 py-2 text-[11px] leading-snug ${commissionErrBanner.tone}`}>
          {commissionErrBanner.text}
        </div>
      ) : null}

      {/* Timeline — same stages as partner portal + DB (`packages/types` lead pipeline). */}
      <div className="surface-card rounded-2xl p-6">
        <h2 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider text-slate-500">
          Lead progress
        </h2>
        <div className="flex items-center gap-0">
          {LEAD_DETAIL_PROGRESS_STEPS.map((step, index) => {
            const done = isWon ? true : !isLost && index < currentStep
            const current = !isLost && index === currentStep

            return (
              <div key={step} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-colors ${
                      done && !current
                        ? "border-green-500 bg-green-950 text-green-400"
                        : current
                          ? "border-indigo-400 bg-indigo-950 text-indigo-300"
                          : "border-zinc-700 bg-white/6 text-slate-600"
                    }`}
                  >
                    {done && !current ? "✓" : index + 1}
                  </div>
                  <p
                    className={`text-xs mt-1.5 text-center whitespace-nowrap max-w-[5.5rem] sm:max-w-none ${
                      current
                        ? "text-indigo-400 font-medium"
                        : done
                          ? "text-slate-400"
                          : "text-slate-600"
                    }`}
                  >
                    {step.replace(/_/g, " ")}
                  </p>
                </div>
                {index < LEAD_DETAIL_PROGRESS_STEPS.length - 1 ? (
                  <div
                    className={`flex-1 h-0.5 mx-1 mb-5 ${
                      isWon || (!isLost && index < currentStep) ? "bg-green-800" : "bg-white/6"
                    }`}
                  />
                ) : null}
              </div>
            )
          })}
          {isLost ? (
            <div className="flex flex-col items-center ml-2">
              <div className="w-8 h-8 rounded-full border-2 border-red-700 bg-red-950 flex items-center justify-center">
                <span className="text-red-400 text-xs font-bold">✕</span>
              </div>
              <p className="text-xs mt-1.5 text-red-500 font-medium">
                Deal lost
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Info */}
        <div className="lg:col-span-2 space-y-6">
          <section className="surface-card rounded-2xl p-6">
            <LeadEditCard
              leadId={lead.id}
              title="Contact & Company"
              icon={<User className="h-4 w-4" />}
              canEdit={canManageLeads}
              fields={contactCompanyFields}
              initialValues={contactCompanyInitial}
            />
          </section>

          <section className="surface-card rounded-2xl p-6">
            <LeadEditCard
              leadId={lead.id}
              title="Source & Ownership"
              icon={<MapPin className="h-4 w-4" />}
              canEdit={canManageLeads}
              fields={sourceOwnershipFields}
              initialValues={sourceOwnershipInitial}
            />
          </section>

          <section className="surface-card rounded-2xl p-6">
            <LeadEditCard
              leadId={lead.id}
              title="Qualification"
              icon={<Briefcase className="h-4 w-4" />}
              canEdit={canManageLeads}
              fields={qualificationFields}
              initialValues={qualificationInitial}
            />
          </section>

          <section className="surface-card rounded-2xl p-6">
            <LeadEditCard
              leadId={lead.id}
              title="Pipeline & Proposal"
              icon={<CircleDollarSign className="h-4 w-4" />}
              canEdit={canManageLeads}
              fields={pipelineFields}
              initialValues={pipelineInitial}
            />
          </section>

          {lead.rejectionReason ? (
            <section className="surface-card rounded-2xl p-6">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-rose-400">
                Rejection reason
              </h3>
              <p className="text-sm leading-6 text-rose-200">{lead.rejectionReason}</p>
            </section>
          ) : null}

          {/* Documents */}
          <div className="surface-card rounded-2xl p-6">
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" />
              Documents
            </h2>
            {leadDocs.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-4">
                No documents attached
              </p>
            ) : (
              <div className="space-y-2">
                {leadDocs.map((doc) => (
                  <a
                    key={doc.id}
                    href={doc.zohoWorkdriveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-white/6 hover:bg-zinc-750 border border-white/8 rounded-lg transition-colors group"
                  >
                    <FileText className="w-4 h-4 text-slate-500 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-white text-xs font-medium truncate">
                        {doc.fileName}
                      </p>
                      <p className="text-slate-500 text-xs capitalize">
                        {doc.documentType}
                      </p>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 flex-shrink-0 transition-colors" />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column — Partner Info */}
        <div className="space-y-6">
          <div className="surface-card rounded-2xl p-6">
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-400" />
              Referring Partner
            </h2>
            {partner ? (
              <div className="space-y-3">
                <div>
                  <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                    Company
                  </p>
                  <p className="text-white text-sm">{partner.companyName || "—"}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                    Contact
                  </p>
                  <p className="text-white text-sm">{partner.contactName}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                    Email
                  </p>
                  <p className="text-zinc-300 text-sm">{partner.email}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                    Type
                  </p>
                  <p className="text-zinc-300 text-sm capitalize">
                    {partner.type}
                  </p>
                </div>
                <Link
                  href={`/partners/${partner.id}`}
                  className="mt-2 flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  View partner profile
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            ) : (
              <p className="text-slate-500 text-sm">Partner not found</p>
            )}
          </div>

          <div className="surface-card rounded-2xl p-6">
            <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
              <CircleDollarSign className="w-4 h-4 text-slate-400" />
              Partner commissions
            </h2>
            <p className="mb-3 text-[11px] leading-snug text-slate-500">
              Mark <span className="text-slate-400">deal won</span> → we spin up deal-close off
              partner&apos;s model, using <span className="text-slate-400">payment</span> first, then{" "}
              <span className="text-slate-400">proposal</span>. Pick{" "}
              <span className="text-slate-400">Payment recurring?</span> and the night job drops renewal
              rows (after deal-close exists). Cash-out path:{" "}
              <Link
                href="/commissions"
                className="text-indigo-400 underline-offset-2 hover:text-indigo-300 hover:underline"
              >
                Commissions
              </Link>{" "}
              → Approve → Start payout → Mark paid.
            </p>
            {lead.status === "deal_won" &&
            canManageCommissions &&
            !hasDealCloseCommission ? (
              <p className="mb-3 rounded-lg border border-amber-500/25 bg-amber-500/10 px-2.5 py-1.5 text-[11px] leading-snug text-amber-200/90">
                No deal-close row—odds are payment + proposal were blank when you hit deal won.
                Fill amounts; Finance can backfill (bot only fires on the won transition).
              </p>
            ) : null}
            {lead.status === "deal_won" && !canManageCommissions ? (
              <p className="mb-3 text-[11px] text-slate-600">Payouts? Finance owns that in Commissions.</p>
            ) : null}
            {lead.paymentReference ? (
              <p className="mb-3 text-[11px] text-slate-500">
                Ref: <span className="font-mono text-slate-300">{lead.paymentReference}</span>
              </p>
            ) : null}
            {leadCommissions.length === 0 ? (
              <p className="text-[11px] text-slate-500">Nothing in the ledger for this lead yet.</p>
            ) : (
              <ul className="space-y-4">
                {leadCommissions.map((row) => {
                  const sourceLabel =
                    row.sourceType === "lead"
                      ? "Deal close"
                      : row.sourceType === "lead_recurring_invoice"
                        ? "Recurring billing period"
                        : row.sourceType === "service_request"
                          ? "Service request"
                          : row.sourceType.replace(/_/g, " ")
                  return (
                    <li
                      key={row.id}
                      className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-white text-sm font-medium">{sourceLabel}</p>
                          <p className="text-slate-500 text-xs font-mono mt-0.5">{row.id}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-white text-sm font-semibold">
                            {formatCurrencyAmount(row.amount) ?? row.amount}
                          </p>
                          <p className="text-slate-500 text-xs capitalize mt-0.5">{row.status}</p>
                        </div>
                      </div>
                      {row.breakdown ? (
                        <p className="text-[11px] leading-snug text-slate-400">{row.breakdown}</p>
                      ) : null}
                      {row.calculationSnapshot != null ? (
                        <details className="group">
                          <summary className="text-slate-400 text-xs cursor-pointer hover:text-slate-300 marker:text-slate-500">
                            Calculation snapshot (JSON)
                          </summary>
                          <pre className="mt-2 max-h-48 overflow-auto rounded-lg border border-white/10 bg-black/40 p-3 text-[11px] text-slate-300 font-mono whitespace-pre-wrap">
                            {JSON.stringify(row.calculationSnapshot, null, 2)}
                          </pre>
                        </details>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {lead.assignedTo && (
            <div className="surface-card rounded-2xl p-6">
              <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400" />
                Assigned To
              </h2>
              <p className="text-zinc-300 text-sm font-mono">
                {lead.assignedTo}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
