import { notFound } from "next/navigation"
import Link from "next/link"
import { auth } from "@repo/auth/server"
import { db, leads, partners, documents } from "@repo/db"
import { eq, and, isNull } from "drizzle-orm"
import {
  ArrowLeft,
  Mail,
  Phone,
  Building2,
  Calendar,
  FileText,
  ExternalLink,
  RefreshCw,
  Upload,
  CheckCircle,
  User,
  Tag,
} from "lucide-react"
import { getActiveTeamMember } from "@/lib/admin-auth"
import { hasAnyTeamRole } from "@/lib/rbac"

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    submitted: "bg-blue-950/60 border-blue-800/40 text-blue-400",
    qualified: "bg-indigo-950/60 border-indigo-800/40 text-indigo-400",
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

function parseJsonArray(value: string | null | undefined) {
  if (!value) {
    return []
  }

  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      : []
  } catch {
    return []
  }
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

function formatIsoDate(value: string | null | undefined) {
  if (!value) {
    return null
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return parsed.toLocaleDateString("en-AE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function ZohoSyncForm({
  leadId,
  canSync,
}: {
  leadId: string
  canSync: boolean
}) {
  return (
    <form action={`/api/leads/${leadId}/sync?redirectTo=/leads/${leadId}`} method="POST">
      <button
        type="submit"
        disabled={!canSync}
        aria-disabled={!canSync}
        title={!canSync ? "Only Admin, Partnership Manager, and SDR roles can sync from CRM." : undefined}
        className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors ${
          canSync
            ? "bg-indigo-600 hover:bg-indigo-500"
            : "cursor-not-allowed bg-slate-700/70 text-slate-300"
        }`}
      >
        <RefreshCw className="h-4 w-4" />
        Sync from CRM
      </button>
    </form>
  )
}

function PushToCrmForm({
  leadId,
  canSync,
  zohoLeadId,
  isPartnerSubmitted,
}: {
  leadId: string
  canSync: boolean
  zohoLeadId: string | null
  isPartnerSubmitted: boolean
}) {
  if (zohoLeadId) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-800/40 bg-emerald-950/60 px-4 py-2 text-sm font-medium text-emerald-400">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        {isPartnerSubmitted ? "Approved" : "In CRM"}
      </span>
    )
  }

  const label = isPartnerSubmitted ? "Approve" : "Push to CRM"
  const Icon = isPartnerSubmitted ? CheckCircle : Upload
  const disabledTitle = isPartnerSubmitted
    ? "Only Admin, Partnership Manager, and SDR roles can approve leads."
    : "Only Admin, Partnership Manager, and SDR roles can push to CRM."

  return (
    <form action={`/api/leads/${leadId}/push-to-crm?redirectTo=/leads/${leadId}`} method="POST">
      <button
        type="submit"
        disabled={!canSync}
        aria-disabled={!canSync}
        title={!canSync ? disabledTitle : undefined}
        className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
          canSync
            ? isPartnerSubmitted
              ? "border border-emerald-800/40 bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/60"
              : "border border-amber-800/40 bg-amber-950/60 text-amber-300 hover:bg-amber-900/60"
            : "cursor-not-allowed bg-slate-700/70 text-slate-400"
        }`}
      >
        <Icon className="h-4 w-4" />
        {label}
      </button>
    </form>
  )
}

const statusTimeline = [
  "submitted",
  "qualified",
  "proposal_sent",
  "deal_won",
]

export default async function LeadDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ sync?: string; reason?: string; status?: string; pushCrm?: string }>
}) {
  const [{ id }, query, { userId }] = await Promise.all([params, searchParams, auth()])

  const [[leadRow], leadDocs, member] = await Promise.all([
    db
      .select({ lead: leads, partner: partners })
      .from(leads)
      .leftJoin(partners, eq(partners.id, leads.partnerId))
      .where(and(eq(leads.id, id), isNull(leads.deletedAt)))
      .limit(1),
    db
      .select()
      .from(documents)
      .where(and(eq(documents.ownerType, "lead"), eq(documents.ownerId, id))),
    userId ? getActiveTeamMember(userId) : Promise.resolve(null),
  ])

  if (!leadRow) notFound()

  const lead = leadRow.lead
  const partner = leadRow.partner

  const services = (() => {
    try {
      return JSON.parse(lead.serviceInterest) as string[]
    } catch {
      return [lead.serviceInterest]
    }
  })()
  const crmServicesList = parseJsonArray(lead.crmServicesList)
  const crmAmount = formatCurrencyAmount(lead.crmAmount)
  const crmArAmount = formatCurrencyAmount(lead.crmArAmount)
  const crmClosingDate = formatIsoDate(lead.crmClosingDate)
  const crmServicePeriodStart = formatIsoDate(lead.crmServicePeriodStart)
  const crmServicePeriodEnd = formatIsoDate(lead.crmServicePeriodEnd)
  const hasCrmSnapshot =
    crmServicesList.length > 0 ||
    Boolean(lead.crmProposal) ||
    Boolean(crmAmount) ||
    Boolean(crmClosingDate) ||
    Boolean(crmArAmount) ||
    Boolean(lead.crmIndustry) ||
    Boolean(lead.crmPaymentId) ||
    Boolean(lead.crmPaymentStatus) ||
    Boolean(lead.crmPaymentRecurring) ||
    Boolean(lead.crmCompanyName) ||
    Boolean(crmServicePeriodStart) ||
    Boolean(crmServicePeriodEnd) ||
    Boolean(lead.crmPaymentMethod) ||
    Boolean(lead.crmServiceType)

  const currentStep = statusTimeline.indexOf(lead.status)

  const canManageLeads = member
    ? hasAnyTeamRole(member.role, ["super_admin", "admin", "partnership_manager", "sdr"])
    : false

  // CRM sync actions require lead management permissions
  const canSyncFromCrm = canManageLeads
  const isPartnerSubmitted = lead.source === "partner_portal"
  const pushCrmBanner =
    query.pushCrm === "ok"
      ? { tone: "border-emerald-400/16 bg-emerald-500/8 text-emerald-100", text: isPartnerSubmitted ? "Lead approved and pushed to Zoho CRM." : "Lead successfully pushed to Zoho CRM." }
      : query.pushCrm === "already_synced"
        ? { tone: "border-sky-400/16 bg-sky-500/8 text-sky-100", text: "This lead is already in Zoho CRM." }
        : query.pushCrm === "error"
          ? {
              tone: "border-rose-400/16 bg-rose-500/8 text-rose-100",
              text: query.reason?.startsWith("crm_rejected:")
                ? `Zoho CRM rejected the push: ${query.reason.slice("crm_rejected:".length)}`
                : query.reason === "crm_rejected"
                  ? "Zoho CRM rejected the push. Check CRM credentials and try again."
                  : query.reason === "forbidden"
                    ? "Your role does not have permission to push leads to CRM."
                    : "Failed to push lead to CRM.",
            }
          : null

  const syncBanner =
    query.sync === "ok"
      ? {
          tone: "border-emerald-400/16 bg-emerald-500/8 text-emerald-100",
          text: query.status
            ? `Lead synced from Zoho CRM. Current status: ${query.status.replace(/_/g, " ")}.`
            : "Lead synced from Zoho CRM.",
        }
      : query.sync === "required"
        ? {
            tone: "border-amber-400/16 bg-amber-500/8 text-amber-100",
            text: "Lead status is controlled by Zoho CRM. Use sync instead of changing it manually.",
          }
        : query.sync === "error"
          ? {
              tone: "border-rose-400/16 bg-rose-500/8 text-rose-100",
              text:
                query.reason === "missing_zoho_lead"
                  ? "This lead is missing its Zoho Lead ID."
                  : query.reason === "deal_create_failed"
                    ? "Zoho marked the lead as qualified, but the associated deal could not be created."
                    : query.reason === "deal_fetch_failed"
                      ? "The associated Zoho deal could not be fetched."
                      : query.reason === "lead_fetch_failed"
                        ? "The Zoho lead could not be fetched."
                        : query.reason === "missing_deal_amount"
                          ? "Zoho deal amount is missing, so commission could not be calculated."
                          : query.reason === "forbidden"
                            ? "Your team role does not have permission to sync leads from Zoho CRM."
                          : "Lead sync from Zoho CRM failed.",
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
        <PushToCrmForm leadId={lead.id} canSync={canSyncFromCrm} zohoLeadId={lead.zohoLeadId} isPartnerSubmitted={lead.source === "partner_portal"} />
        <ZohoSyncForm leadId={lead.id} canSync={canSyncFromCrm && Boolean(lead.zohoLeadId)} />
        <div className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-slate-300">
          Status syncs from Zoho CRM.
        </div>
        {!canSyncFromCrm ? (
          <div className="rounded-lg border border-amber-400/16 bg-amber-500/8 px-4 py-2 text-sm text-amber-100">
            CRM sync is limited to Admin, Partnership Manager, and SDR roles.
          </div>
        ) : null}
      </div>

      {pushCrmBanner ? (
        <div className={`rounded-xl border px-4 py-3 text-sm ${pushCrmBanner.tone}`}>
          {pushCrmBanner.text}
        </div>
      ) : null}
      {syncBanner ? (
        <div className={`rounded-xl border px-4 py-3 text-sm ${syncBanner.tone}`}>
          {syncBanner.text}
        </div>
      ) : null}

      {/* Timeline */}
      <div className="surface-card rounded-2xl p-6">
        <h2 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider text-slate-500">
          Lead Progress
        </h2>
        <div className="flex items-center gap-0">
          {statusTimeline.map((step, index) => {
            const isCompleted =
              lead.status === "deal_won"
                ? true
                : lead.status === "deal_lost"
                  ? index < currentStep
                  : index < currentStep
            const isCurrent =
              lead.status !== "deal_lost" && index === currentStep
            const isTerminal = lead.status === "deal_lost" || lead.status === "deal_won"

            return (
              <div key={step} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-colors ${
                      isTerminal && index >= currentStep
                        ? "border-zinc-700 bg-white/6 text-slate-600"
                        : isCurrent
                          ? "border-indigo-400 bg-indigo-950 text-indigo-300"
                          : isCompleted
                            ? "border-green-500 bg-green-950 text-green-400"
                            : "border-zinc-700 bg-white/6 text-slate-600"
                    }`}
                  >
                    {isCompleted && !isCurrent ? "✓" : index + 1}
                  </div>
                  <p
                    className={`text-xs mt-1.5 text-center capitalize whitespace-nowrap ${
                      isCurrent
                        ? "text-indigo-400 font-medium"
                        : isCompleted
                          ? "text-slate-400"
                          : "text-slate-600"
                    }`}
                  >
                    {step.replace(/_/g, " ")}
                  </p>
                </div>
                {index < statusTimeline.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-1 mb-5 ${
                      index < currentStep && lead.status !== "deal_lost"
                        ? "bg-green-800"
                        : "bg-white/6"
                    }`}
                  />
                )}
              </div>
            )
          })}
          {lead.status === "deal_lost" && (
            <div className="flex flex-col items-center ml-2">
              <div className="w-8 h-8 rounded-full border-2 border-red-700 bg-red-950 flex items-center justify-center">
                <span className="text-red-400 text-xs font-bold">✕</span>
              </div>
              <p className="text-xs mt-1.5 text-red-500 font-medium">
                Deal Lost
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="surface-card rounded-2xl p-6">
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-slate-400" />
              Customer Information
            </h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <dt className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                  Full Name
                </dt>
                <dd className="text-white text-sm">{lead.customerName}</dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                  Email
                </dt>
                <dd className="text-white text-sm flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  {lead.customerEmail}
                </dd>
              </div>
              {lead.customerPhone && (
                <div>
                  <dt className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                    Phone
                  </dt>
                  <dd className="text-white text-sm flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    {lead.customerPhone}
                  </dd>
                </div>
              )}
              {lead.customerCompany && (
                <div>
                  <dt className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                    Company
                  </dt>
                  <dd className="text-white text-sm flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-500" />
                    {lead.customerCompany}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                  Submitted
                </dt>
                <dd className="text-white text-sm flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  {new Date(lead.createdAt).toLocaleDateString("en-AE", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </dd>
              </div>
              {lead.convertedAt && (
                <div>
                  <dt className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                    Converted
                  </dt>
                  <dd className="text-white text-sm">
                    {new Date(lead.convertedAt).toLocaleDateString("en-AE", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </dd>
                </div>
              )}
              <div className="sm:col-span-2">
                <dt className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                  Service List (Initial Inquiry For)
                </dt>
                <dd className="flex flex-wrap gap-1.5 mt-1">
                  {services.map((s) => (
                    <span
                      key={s}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/6 border border-white/8 rounded text-xs text-zinc-300"
                    >
                      <Tag className="w-3 h-3 text-slate-500" />
                      {s}
                    </span>
                  ))}
                </dd>
              </div>
              {hasCrmSnapshot ? (
                <div className="sm:col-span-2">
                  <dt className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-2">
                    CRM Deal Snapshot
                  </dt>
                  <dd className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {crmServicesList.length > 0 ? (
                        <div className="sm:col-span-2">
                          <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                            List of Services (Proposal Scope)
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {crmServicesList.map((service) => (
                              <span
                                key={service}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/6 border border-white/8 rounded text-xs text-zinc-300"
                              >
                                <Tag className="w-3 h-3 text-slate-500" />
                                {service}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      {lead.crmProposal ? (
                        <div>
                          <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                            Proposal
                          </p>
                          <p className="text-white text-sm break-words">{lead.crmProposal}</p>
                        </div>
                      ) : null}
                      {lead.crmPaymentId ? (
                        <div>
                          <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                            Payment ID
                          </p>
                          <p className="text-white text-sm break-words">{lead.crmPaymentId}</p>
                        </div>
                      ) : null}
                      {lead.crmPaymentStatus ? (
                        <div>
                          <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                            Payment Status
                          </p>
                          <p className="text-white text-sm">{lead.crmPaymentStatus}</p>
                        </div>
                      ) : null}
                      {crmAmount ? (
                        <div>
                          <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                            Amount
                          </p>
                          <p className="text-white text-sm">{crmAmount}</p>
                        </div>
                      ) : null}
                      {crmClosingDate ? (
                        <div>
                          <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                            Closing Date
                          </p>
                          <p className="text-white text-sm">{crmClosingDate}</p>
                        </div>
                      ) : null}
                      {crmArAmount ? (
                        <div>
                          <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                            AR Amount
                          </p>
                          <p className="text-white text-sm">{crmArAmount}</p>
                        </div>
                      ) : null}
                      {lead.crmPaymentRecurring ? (
                        <div>
                          <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                            Payment Recurring
                          </p>
                          <p className="text-white text-sm">{lead.crmPaymentRecurring}</p>
                        </div>
                      ) : null}
                      {lead.crmCompanyName ? (
                        <div>
                          <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                            Company Name
                          </p>
                          <p className="text-white text-sm">{lead.crmCompanyName}</p>
                        </div>
                      ) : null}
                      {lead.crmIndustry ? (
                        <div>
                          <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                            Industry
                          </p>
                          <p className="text-white text-sm">{lead.crmIndustry}</p>
                        </div>
                      ) : null}
                      {crmServicePeriodStart ? (
                        <div>
                          <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                            Service Start
                          </p>
                          <p className="text-white text-sm">{crmServicePeriodStart}</p>
                        </div>
                      ) : null}
                      {crmServicePeriodEnd ? (
                        <div>
                          <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                            Service End
                          </p>
                          <p className="text-white text-sm">{crmServicePeriodEnd}</p>
                        </div>
                      ) : null}
                      {lead.crmPaymentMethod ? (
                        <div>
                          <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                            Payment Method
                          </p>
                          <p className="text-white text-sm">{lead.crmPaymentMethod}</p>
                        </div>
                      ) : null}
                      {lead.crmServiceType ? (
                        <div>
                          <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                            Service Type
                          </p>
                          <p className="text-white text-sm">{lead.crmServiceType}</p>
                        </div>
                      ) : null}
                    </div>
                  </dd>
                </div>
              ) : null}
              {lead.notes && (
                <div className="sm:col-span-2">
                  <dt className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                    Notes
                  </dt>
                  <dd className="text-zinc-300 text-sm bg-white/6 border border-white/8 rounded-lg p-3">
                    {lead.notes}
                  </dd>
                </div>
              )}
              {lead.rejectionReason && (
                <div className="sm:col-span-2">
                  <dt className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                    Rejection Reason
                  </dt>
                  <dd className="text-red-400 text-sm">{lead.rejectionReason}</dd>
                </div>
              )}
            </dl>
          </div>

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
