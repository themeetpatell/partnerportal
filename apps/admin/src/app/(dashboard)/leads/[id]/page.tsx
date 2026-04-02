import { notFound } from "next/navigation"
import Link from "next/link"
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
  User,
  Tag,
} from "lucide-react"

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    submitted: "bg-blue-950/60 border-blue-800/40 text-blue-400",
    in_review: "bg-indigo-950/60 border-indigo-800/40 text-indigo-400",
    qualified: "bg-indigo-950/60 border-indigo-800/40 text-indigo-400",
    proposal_sent: "bg-yellow-950/60 border-yellow-800/40 text-yellow-400",
    converted: "bg-green-950/60 border-green-800/40 text-green-400",
    rejected: "bg-red-950/60 border-red-800/40 text-red-400",
  }
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${map[status] ?? "bg-white/6 border-white/10 text-slate-400"}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  )
}

function StatusUpdateForm({
  leadId,
  nextStatus,
  label,
  variant = "primary",
}: {
  leadId: string
  nextStatus: string
  label: string
  variant?: "primary" | "danger" | "secondary"
}) {
  const styles = {
    primary:
      "bg-indigo-400 hover:bg-indigo-500 text-white",
    danger:
      "bg-red-600 hover:bg-red-500 text-white",
    secondary:
      "bg-zinc-700 hover:bg-zinc-600 text-white",
  }
  return (
    <form
      action={`/api/leads/${leadId}/status`}
      method="POST"
      className="inline"
    >
      <input type="hidden" name="status" value={nextStatus} />
      <button
        type="submit"
        className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${styles[variant]}`}
      >
        {label}
      </button>
    </form>
  )
}

const statusTransitions: Record<
  string,
  { nextStatus: string; label: string; variant: "primary" | "danger" | "secondary" }[]
> = {
  submitted: [
    { nextStatus: "in_review", label: "Mark In Review", variant: "primary" },
  ],
  in_review: [
    { nextStatus: "qualified", label: "Mark Qualified", variant: "primary" },
    { nextStatus: "rejected", label: "Reject", variant: "danger" },
  ],
  qualified: [
    {
      nextStatus: "proposal_sent",
      label: "Mark Proposal Sent",
      variant: "primary",
    },
    { nextStatus: "rejected", label: "Reject", variant: "danger" },
  ],
  proposal_sent: [
    { nextStatus: "converted", label: "Mark Converted", variant: "primary" },
    { nextStatus: "rejected", label: "Reject", variant: "danger" },
  ],
}

const statusTimeline = [
  "submitted",
  "in_review",
  "qualified",
  "proposal_sent",
  "converted",
]

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [lead] = await db
    .select()
    .from(leads)
    .where(and(eq(leads.id, id), isNull(leads.deletedAt)))
    .limit(1)

  if (!lead) notFound()

  const [partner] = await db
    .select()
    .from(partners)
    .where(eq(partners.id, lead.partnerId))
    .limit(1)

  const leadDocs = await db
    .select()
    .from(documents)
    .where(and(eq(documents.ownerType, "lead"), eq(documents.ownerId, id)))

  const services = (() => {
    try {
      return JSON.parse(lead.serviceInterest) as string[]
    } catch {
      return [lead.serviceInterest]
    }
  })()

  const transitions = statusTransitions[lead.status] ?? []

  const currentStep = statusTimeline.indexOf(lead.status)

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

      {/* Status Action Buttons */}
      {transitions.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          {transitions.map((t) => (
            <StatusUpdateForm
              key={t.nextStatus}
              leadId={lead.id}
              nextStatus={t.nextStatus}
              label={t.label}
              variant={t.variant}
            />
          ))}
        </div>
      )}

      {/* Timeline */}
      <div className="surface-card rounded-2xl p-6">
        <h2 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider text-slate-500">
          Lead Progress
        </h2>
        <div className="flex items-center gap-0">
          {statusTimeline.map((step, index) => {
            const isCompleted =
              lead.status === "converted"
                ? true
                : lead.status === "rejected"
                  ? index < currentStep
                  : index < currentStep
            const isCurrent =
              lead.status !== "rejected" && index === currentStep
            const isRejected = lead.status === "rejected"

            return (
              <div key={step} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-colors ${
                      isRejected && index >= currentStep
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
                      index < currentStep && lead.status !== "rejected"
                        ? "bg-green-800"
                        : "bg-white/6"
                    }`}
                  />
                )}
              </div>
            )
          })}
          {lead.status === "rejected" && (
            <div className="flex flex-col items-center ml-2">
              <div className="w-8 h-8 rounded-full border-2 border-red-700 bg-red-950 flex items-center justify-center">
                <span className="text-red-400 text-xs font-bold">✕</span>
              </div>
              <p className="text-xs mt-1.5 text-red-500 font-medium">
                Rejected
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
                  Services of Interest
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
                  <p className="text-white text-sm">{partner.companyName}</p>
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
