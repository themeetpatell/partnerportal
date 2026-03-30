import { notFound } from "next/navigation"
import Link from "next/link"
import { db, partners, documents, leads, commissions } from "@repo/db"
import { eq, and, sum } from "drizzle-orm"
import {
  Building2,
  Mail,
  Phone,
  Calendar,
  FileText,
  Users,
  DollarSign,
  ArrowLeft,
  CheckCircle,
  XCircle,
  PauseCircle,
  RotateCcw,
  ExternalLink,
} from "lucide-react"

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-yellow-950/60 border-yellow-800/40 text-yellow-400",
    approved: "bg-green-950/60 border-green-800/40 text-green-400",
    rejected: "bg-red-950/60 border-red-800/40 text-red-400",
    suspended: "bg-white/6 border-white/10 text-slate-400",
    submitted: "bg-blue-950/60 border-blue-800/40 text-blue-400",
    in_review: "bg-indigo-950/60 border-indigo-800/40 text-indigo-400",
    converted: "bg-green-950/60 border-green-800/40 text-green-400",
  }
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border capitalize ${map[status] ?? "bg-white/6 border-white/10 text-slate-400"}`}
    >
      {status.replace("_", " ")}
    </span>
  )
}

export default async function PartnerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [partner] = await db
    .select()
    .from(partners)
    .where(eq(partners.id, id))
    .limit(1)

  if (!partner) notFound()

  const [partnerDocs, partnerLeads, commissionsResult] = await Promise.all([
    db
      .select()
      .from(documents)
      .where(and(eq(documents.ownerType, "partner"), eq(documents.ownerId, id))),
    db
      .select()
      .from(leads)
      .where(eq(leads.partnerId, id))
      .orderBy(leads.createdAt)
      .limit(5),
    db
      .select({ total: sum(commissions.amount) })
      .from(commissions)
      .where(eq(commissions.partnerId, id)),
  ])

  const totalCommissions = Number(commissionsResult[0]?.total ?? 0).toLocaleString(
    "en-AE",
    { minimumFractionDigits: 2, maximumFractionDigits: 2 }
  )

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div>
        <Link
          href="/partners"
          className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white text-sm mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Partners
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {partner.companyName}
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Partner ID: {partner.id}
            </p>
          </div>
          <StatusBadge status={partner.status} />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 flex-wrap">
        {partner.status === "pending" && (
          <>
            <form action={`/api/partners/${partner.id}/approve`} method="POST">
              <button
                type="submit"
                className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                Approve Partner
              </button>
            </form>
            <form action={`/api/partners/${partner.id}/reject`} method="POST">
              <button
                type="submit"
                className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <XCircle className="w-4 h-4" />
                Reject Partner
              </button>
            </form>
          </>
        )}
        {partner.status === "approved" && (
          <form action={`/api/partners/${partner.id}/reject`} method="POST">
            <button
              type="submit"
              className="inline-flex items-center gap-2 bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <PauseCircle className="w-4 h-4" />
              Suspend Partner
            </button>
          </form>
        )}
        {(partner.status === "rejected" || partner.status === "suspended") && (
          <form action={`/api/partners/${partner.id}/approve`} method="POST">
            <button
              type="submit"
              className="inline-flex items-center gap-2 bg-indigo-400 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reactivate Partner
            </button>
          </form>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Company Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="surface-card rounded-2xl p-6">
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-400" />
              Company Information
            </h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <dt className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                  Company Name
                </dt>
                <dd className="text-white text-sm">{partner.companyName}</dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                  Partner Type
                </dt>
                <dd className="text-white text-sm capitalize">
                  {partner.type}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                  Contact Name
                </dt>
                <dd className="text-white text-sm">
                  {partner.contactName}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                  Email
                </dt>
                <dd className="text-white text-sm flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  {partner.email}
                </dd>
              </div>
              {partner.phone && (
                <div>
                  <dt className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                    Phone
                  </dt>
                  <dd className="text-white text-sm flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    {partner.phone}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                  Registered
                </dt>
                <dd className="text-white text-sm flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  {new Date(partner.createdAt).toLocaleDateString("en-AE", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </dd>
              </div>
              {partner.onboardedAt && (
                <div>
                  <dt className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                    Onboarded
                  </dt>
                  <dd className="text-white text-sm">
                    {new Date(partner.onboardedAt).toLocaleDateString("en-AE", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </dd>
                </div>
              )}
              {partner.rejectionReason && (
                <div className="sm:col-span-2">
                  <dt className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                    Rejection Reason
                  </dt>
                  <dd className="text-red-400 text-sm">
                    {partner.rejectionReason}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Leads */}
          <div className="surface-card rounded-2xl">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-white font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-400" />
                Recent Leads
              </h2>
              <Link
                href={`/leads?partnerId=${partner.id}`}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                View all
              </Link>
            </div>
            {partnerLeads.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <p className="text-slate-500 text-sm">No leads submitted yet</p>
              </div>
            ) : (
              <div className="divide-y divide-white/8">
                {partnerLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="px-6 py-3.5 flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium truncate">
                        {lead.customerName}
                      </p>
                      <p className="text-slate-500 text-xs">
                        {lead.customerCompany || lead.customerEmail}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border capitalize ${
                          {
                            submitted:
                              "bg-blue-950/60 border-blue-800/40 text-blue-400",
                            in_review:
                              "bg-indigo-950/60 border-indigo-800/40 text-indigo-400",
                            converted:
                              "bg-green-950/60 border-green-800/40 text-green-400",
                            rejected:
                              "bg-red-950/60 border-red-800/40 text-red-400",
                          }[lead.status] ??
                          "bg-white/6 border-white/10 text-slate-400"
                        }`}
                      >
                        {lead.status.replace("_", " ")}
                      </span>
                      <Link
                        href={`/leads/${lead.id}`}
                        className="text-slate-400 hover:text-white transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Commission Summary */}
          <div className="surface-card rounded-2xl p-6">
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-slate-400" />
              Commissions
            </h2>
            <div className="text-center py-4">
              <p className="text-3xl font-bold text-white">
                AED {totalCommissions}
              </p>
              <p className="text-slate-500 text-xs mt-1">Total all-time</p>
            </div>
            <Link
              href={`/commissions?partnerId=${partner.id}`}
              className="mt-4 block text-center text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              View commission history
            </Link>
          </div>

          {/* Documents */}
          <div className="surface-card rounded-2xl p-6">
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" />
              Documents
            </h2>
            {partnerDocs.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-4">
                No documents uploaded
              </p>
            ) : (
              <div className="space-y-2">
                {partnerDocs.map((doc) => (
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
                    <ExternalLink className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition-colors flex-shrink-0" />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
