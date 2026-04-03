import { currentUser } from "@repo/auth/server"
import { db, leads, partners, documents } from "@repo/db"
import { and, eq, isNull } from "drizzle-orm"
import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ArrowLeft,
  Building2,
  Calendar,
  ExternalLink,
  FileText,
  Mail,
  Phone,
  Tag,
  User,
} from "lucide-react"

const statusStyles: Record<string, string> = {
  submitted: "border border-zinc-300/20 bg-zinc-300/10 text-zinc-100",
  qualified: "border border-sky-400/20 bg-sky-500/10 text-sky-100",
  proposal_sent: "border border-indigo-400/20 bg-indigo-500/10 text-indigo-100",
  deal_won: "border border-emerald-400/20 bg-emerald-500/10 text-emerald-100",
  deal_lost: "border border-zinc-700/20 bg-zinc-700/10 text-zinc-400",
}

const statusTimeline = ["submitted", "qualified", "proposal_sent", "deal_won"]

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

function formatCurrency(value: string | null | undefined) {
  if (!value) return null
  const n = Number(value)
  if (!Number.isFinite(n)) return value
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    maximumFractionDigits: 2,
  }).format(n)
}

function formatIsoDate(value: string | null | undefined) {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString("en-AE", { day: "numeric", month: "long", year: "numeric" })
}

function formatDateTime(date: Date | null) {
  if (!date) return "—"
  return new Date(date).toLocaleDateString("en-AE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-white">{value}</dd>
    </div>
  )
}

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await currentUser()
  if (!user) notFound()

  const [partner] = await db
    .select()
    .from(partners)
    .where(eq(partners.authUserId, user.id))
    .limit(1)

  if (!partner) notFound()

  const [[lead], leadDocs] = await Promise.all([
    db
      .select()
      .from(leads)
      .where(and(eq(leads.id, id), eq(leads.partnerId, partner.id), isNull(leads.deletedAt)))
      .limit(1),
    db
      .select()
      .from(documents)
      .where(and(eq(documents.ownerType, "lead"), eq(documents.ownerId, id))),
  ])

  if (!lead) notFound()

  const services = parseJsonArray(lead.serviceInterest)
  const crmServicesList = parseJsonArray(lead.crmServicesList)
  const crmAmount = formatCurrency(lead.crmAmount?.toString())
  const crmArAmount = formatCurrency(lead.crmArAmount?.toString())
  const crmClosingDate = formatIsoDate(lead.crmClosingDate)
  const crmServicePeriodStart = formatIsoDate(lead.crmServicePeriodStart)
  const crmServicePeriodEnd = formatIsoDate(lead.crmServicePeriodEnd)

  const hasCrmSnapshot =
    crmServicesList.length > 0 ||
    lead.crmProposal ||
    crmAmount ||
    crmClosingDate ||
    crmArAmount ||
    lead.crmIndustry ||
    lead.crmPaymentId ||
    lead.crmPaymentStatus ||
    lead.crmPaymentRecurring ||
    lead.crmCompanyName ||
    crmServicePeriodStart ||
    crmServicePeriodEnd ||
    lead.crmPaymentMethod ||
    lead.crmServiceType

  const currentStep = statusTimeline.indexOf(lead.status)
  const isLost = lead.status === "deal_lost"

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="surface-card rounded-[2rem] px-6 py-7 sm:px-8">
        <Link
          href="/dashboard/leads"
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to leads
        </Link>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="page-title">{lead.customerName}</h1>
            {lead.customerCompany ? (
              <p className="mt-1 text-base text-slate-400">{lead.customerCompany}</p>
            ) : null}
            <p className="mt-1 text-xs text-slate-600">Lead ID: {lead.id}</p>
          </div>
          <span
            className={`status-pill self-start text-sm ${statusStyles[lead.status] ?? "border border-white/10 bg-white/[0.05] text-slate-300"}`}
          >
            {lead.status.replace(/_/g, " ")}
          </span>
        </div>

        {/* Progress timeline */}
        <div className="mt-6 flex items-center">
          {statusTimeline.map((step, i) => {
            const isWon = lead.status === "deal_won"
            const done = isWon ? true : !isLost && i < currentStep
            const current = !isLost && i === currentStep
            return (
              <div key={step} className="flex flex-1 items-center last:flex-none">
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                      done && !current
                        ? "bg-emerald-500 text-white"
                        : current
                          ? "bg-indigo-500 text-white ring-2 ring-indigo-400/40 ring-offset-1 ring-offset-transparent"
                          : "border border-white/15 bg-white/[0.04] text-slate-600"
                    }`}
                  >
                    {done && !current ? "✓" : i + 1}
                  </div>
                  <span className={`hidden text-[11px] sm:block ${current ? "text-indigo-300" : done ? "text-slate-400" : "text-slate-600"}`}>
                    {step.replace(/_/g, " ")}
                  </span>
                </div>
                {i < statusTimeline.length - 1 ? (
                  <div className={`h-px flex-1 ${done ? "bg-emerald-600/50" : "bg-white/10"}`} />
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
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left — main details */}
        <div className="space-y-6 lg:col-span-2">
          {/* Customer info */}
          <section className="surface-card rounded-[2rem] px-6 py-6">
            <h2 className="flex items-center gap-2 font-heading text-lg font-semibold text-white">
              <User className="h-4 w-4 text-slate-400" />
              Customer information
            </h2>
            <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Full name" value={lead.customerName} />
              <Field
                label="Email"
                value={
                  <a href={`mailto:${lead.customerEmail}`} className="text-indigo-300 hover:text-indigo-200">
                    {lead.customerEmail}
                  </a>
                }
              />
              {lead.customerPhone ? (
                <Field
                  label="Phone"
                  value={
                    <a href={`tel:${lead.customerPhone}`} className="text-indigo-300 hover:text-indigo-200">
                      {lead.customerPhone}
                    </a>
                  }
                />
              ) : null}
              <Field label="Company" value={lead.customerCompany} />
              <Field label="Submitted" value={formatDateTime(lead.createdAt)} />
              {lead.convertedAt ? (
                <Field label="Deal won" value={formatDateTime(lead.convertedAt)} />
              ) : null}

              {/* Services of interest */}
              {services.length > 0 ? (
                <div className="sm:col-span-2">
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Services of interest
                  </dt>
                  <dd className="mt-2 flex flex-wrap gap-1.5">
                    {services.map((s) => (
                      <span
                        key={s}
                        className="flex items-center gap-1 rounded-lg border border-white/8 bg-white/[0.05] px-2.5 py-1 text-xs text-zinc-300"
                      >
                        <Tag className="h-3 w-3 text-slate-500" />
                        {s}
                      </span>
                    ))}
                  </dd>
                </div>
              ) : null}

              {/* Notes */}
              {lead.notes ? (
                <div className="sm:col-span-2">
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Notes
                  </dt>
                  <dd className="mt-2 rounded-xl border border-white/8 bg-white/[0.03] p-3 text-sm text-slate-300">
                    {lead.notes}
                  </dd>
                </div>
              ) : null}
            </dl>
          </section>

          {/* CRM Deal Snapshot */}
          {hasCrmSnapshot ? (
            <section className="surface-card rounded-[2rem] px-6 py-6">
              <h2 className="font-heading text-lg font-semibold text-white">CRM deal snapshot</h2>
              <p className="mt-1 text-sm text-slate-400">
                Data synced from Zoho CRM after your lead progressed.
              </p>

              {crmServicesList.length > 0 ? (
                <div className="mt-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Proposal services
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {crmServicesList.map((s) => (
                      <span
                        key={s}
                        className="flex items-center gap-1 rounded-lg border border-indigo-400/20 bg-indigo-500/10 px-2.5 py-1 text-xs text-indigo-100"
                      >
                        <Tag className="h-3 w-3" />
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Proposal" value={lead.crmProposal} />
                <Field label="Amount" value={crmAmount} />
                <Field label="AR amount" value={crmArAmount} />
                <Field label="Closing date" value={crmClosingDate} />
                <Field label="Service period start" value={crmServicePeriodStart} />
                <Field label="Service period end" value={crmServicePeriodEnd} />
                <Field label="Payment status" value={lead.crmPaymentStatus} />
                <Field label="Payment method" value={lead.crmPaymentMethod} />
                <Field label="Payment recurring" value={lead.crmPaymentRecurring} />
                <Field label="Payment ID" value={lead.crmPaymentId} />
                <Field label="Industry" value={lead.crmIndustry} />
                <Field label="Company name (CRM)" value={lead.crmCompanyName} />
                <Field label="Service type" value={lead.crmServiceType} />
              </dl>
            </section>
          ) : null}

          {/* Documents */}
          <section className="surface-card rounded-[2rem] px-6 py-6">
            <h2 className="flex items-center gap-2 font-heading text-lg font-semibold text-white">
              <FileText className="h-4 w-4 text-slate-400" />
              Documents
            </h2>
            {leadDocs.length === 0 ? (
              <p className="mt-4 text-center text-sm text-slate-500">No documents attached.</p>
            ) : (
              <div className="mt-4 space-y-2">
                {leadDocs.map((doc) => (
                  <a
                    key={doc.id}
                    href={doc.zohoWorkdriveUrl ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-3 transition-colors hover:bg-white/[0.06]"
                  >
                    <FileText className="h-4 w-4 shrink-0 text-slate-500" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">{doc.fileName}</p>
                      <p className="text-xs capitalize text-slate-500">{doc.documentType}</p>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-600 transition-colors group-hover:text-slate-400" />
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
            <h2 className="flex items-center gap-2 font-heading text-lg font-semibold text-white">
              <Calendar className="h-4 w-4 text-slate-400" />
              Key dates
            </h2>
            <dl className="mt-4 space-y-3">
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Submitted</dt>
                <dd className="mt-1 text-sm text-white">{formatDateTime(lead.createdAt)}</dd>
              </div>
              {lead.convertedAt ? (
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-500">Deal won</dt>
                  <dd className="mt-1 text-sm text-white">{formatDateTime(lead.convertedAt)}</dd>
                </div>
              ) : null}
              {crmClosingDate ? (
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">CRM closing date</dt>
                  <dd className="mt-1 text-sm text-white">{crmClosingDate}</dd>
                </div>
              ) : null}
            </dl>
          </section>

          {/* Source info */}
          <section className="surface-card rounded-[2rem] px-6 py-6">
            <h2 className="flex items-center gap-2 font-heading text-lg font-semibold text-white">
              <Building2 className="h-4 w-4 text-slate-400" />
              Lead source
            </h2>
            <dl className="mt-4 space-y-3">
              <Field label="Channel" value={lead.channel?.replace(/_/g, " ")} />
              <Field label="Country" value={lead.country} />
              <Field label="City" value={lead.city} />
            </dl>
          </section>

          {/* Next steps for won leads */}
          {lead.status === "deal_won" ? (
            <section className="surface-card rounded-[2rem] px-6 py-6">
              <h2 className="font-heading text-lg font-semibold text-white">Next steps</h2>
              <p className="mt-1 text-sm text-slate-400">
                This lead is won. You can cross-sell or upsell to this client.
              </p>
              <div className="mt-4 flex flex-col gap-2">
                <Link href="/dashboard/service-requests/new" className="primary-button justify-center">
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
