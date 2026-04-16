import Link from "next/link"
import { notFound } from "next/navigation"
import { db, leads, partners, serviceRequests, services, teamMembers } from "@repo/db"
import { and, eq, isNull } from "drizzle-orm"
import {
  ArrowLeft,
  Building2,
  Calendar,
  ClipboardList,
  Mail,
  User,
} from "lucide-react"

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-yellow-950/60 border-yellow-800/40 text-yellow-300",
    in_progress: "bg-blue-950/60 border-blue-800/40 text-blue-300",
    completed: "bg-green-950/60 border-green-800/40 text-green-300",
    cancelled: "bg-red-950/60 border-red-800/40 text-red-300",
  }

  return (
    <span className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium capitalize ${map[status] ?? "bg-white/6 border-white/10 text-slate-300"}`}>
      {status.replace(/_/g, " ")}
    </span>
  )
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) {
    return "—"
  }

  const parsed = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return "—"
  }

  return parsed.toLocaleDateString("en-AE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function formatMoney(value: string | null | undefined) {
  if (!value) {
    return "—"
  }

  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    maximumFractionDigits: 2,
  }).format(Number(value))
}

function parseServicesList(value: string | null | undefined) {
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

export default async function ServiceRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [row] = await db
    .select({
      request: serviceRequests,
      partner: partners,
      service: services,
      lead: leads,
    })
    .from(serviceRequests)
    .leftJoin(partners, eq(serviceRequests.partnerId, partners.id))
    .leftJoin(services, eq(serviceRequests.serviceId, services.id))
    .leftJoin(leads, eq(serviceRequests.leadId, leads.id))
    .where(and(eq(serviceRequests.id, id), isNull(serviceRequests.deletedAt)))
    .limit(1)

  if (!row) {
    notFound()
  }

  const [assignedMember] = row.request.assignedTo
    ? await db
        .select({ name: teamMembers.name })
        .from(teamMembers)
        .where(and(eq(teamMembers.authUserId, row.request.assignedTo), eq(teamMembers.isActive, true)))
        .limit(1)
    : []

  const requestedServices = row.service?.name
    ? [row.service.name]
    : parseServicesList(row.request.servicesList)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <Link
            href="/service-requests"
            className="inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to service requests
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">{row.request.customerCompany}</h1>
              <StatusBadge status={row.request.status} />
            </div>
            <p className="mt-1 text-sm text-slate-400">
              Request created on {formatDate(row.request.createdAt)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="space-y-6">
          <div className="surface-card rounded-2xl p-6">
            <h2 className="mb-4 text-white font-semibold">Request Summary</h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wider text-slate-500">Partner</dt>
                <dd className="mt-1 text-sm text-white">
                  {row.partner ? (
                    <Link href={`/partners/${row.partner.id}`} className="hover:text-indigo-300 transition-colors">
                      {row.partner.companyName}
                    </Link>
                  ) : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-slate-500">Assigned To</dt>
                <dd className="mt-1 text-sm text-white">{assignedMember?.name ?? "Unassigned"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-slate-500">Services</dt>
                <dd className="mt-1 text-sm text-white">
                  {requestedServices.length > 0 ? requestedServices.join(", ") : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-slate-500">Pricing</dt>
                <dd className="mt-1 text-sm text-white">{formatMoney(row.request.pricing)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-slate-500">Start Date</dt>
                <dd className="mt-1 text-sm text-white">{formatDate(row.request.startDate)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-slate-500">Target End Date</dt>
                <dd className="mt-1 text-sm text-white">{formatDate(row.request.endDate)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-slate-500">Completed At</dt>
                <dd className="mt-1 text-sm text-white">{formatDate(row.request.completedAt)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-slate-500">Cancelled At</dt>
                <dd className="mt-1 text-sm text-white">{formatDate(row.request.cancelledAt)}</dd>
              </div>
            </dl>
          </div>

          <div className="surface-card rounded-2xl p-6">
            <h2 className="mb-4 text-white font-semibold">Customer</h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wider text-slate-500">Contact</dt>
                <dd className="mt-1 text-sm text-white">{row.request.customerContact}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-slate-500">Email</dt>
                <dd className="mt-1 text-sm text-white">{row.request.customerEmail}</dd>
              </div>
            </dl>
          </div>

          <div className="surface-card rounded-2xl p-6">
            <h2 className="mb-4 text-white font-semibold">Internal Notes</h2>
            <p className="whitespace-pre-wrap text-sm text-slate-300">
              {row.request.notes || row.request.onBehalfNote || "No notes added."}
            </p>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="surface-card rounded-2xl p-6">
            <h2 className="mb-4 text-white font-semibold">Quick Links</h2>
            <div className="space-y-3">
              {row.partner ? (
                <Link
                  href={`/partners/${row.partner.id}`}
                  className="flex items-center gap-3 rounded-xl border border-white/10 px-4 py-3 text-sm text-slate-200 transition-colors hover:bg-white/[0.04]"
                >
                  <Building2 className="h-4 w-4 text-slate-400" />
                  Open partner
                </Link>
              ) : null}
              {row.lead ? (
                <Link
                  href={`/leads/${row.lead.id}`}
                  className="flex items-center gap-3 rounded-xl border border-white/10 px-4 py-3 text-sm text-slate-200 transition-colors hover:bg-white/[0.04]"
                >
                  <User className="h-4 w-4 text-slate-400" />
                  Open linked lead
                </Link>
              ) : null}
            </div>
          </div>

          <div className="surface-card rounded-2xl p-6">
            <h2 className="mb-4 text-white font-semibold">Metadata</h2>
            <div className="space-y-3 text-sm text-slate-300">
              <div className="flex items-center gap-3">
                <ClipboardList className="h-4 w-4 text-slate-500" />
                <span>ID: <span className="font-mono text-slate-400">{row.request.id}</span></span>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-slate-500" />
                <span>SLA status: <span className="capitalize">{row.request.slaStatus.replace(/_/g, " ")}</span></span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-slate-500" />
                <span>Created by: {row.request.createdBy ?? "System"}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
