import { currentUser } from "@repo/auth/server"
import {
  db,
  leads,
  partnerClients,
  partners,
  serviceRequests,
  services,
} from "@repo/db"
import { and, desc, eq, isNull } from "drizzle-orm"
import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ArrowLeft,
  Building2,
  Calendar,
  Globe,
  Mail,
  MapPin,
  NotebookText,
  Phone,
  User,
} from "lucide-react"
import { buildClientKey, buildClientRecords } from "@/lib/client-records"

function formatDate(date: Date | null | undefined) {
  if (!date) return "—"
  return new Date(date).toLocaleDateString("en-AE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function formatLabel(value: string) {
  return value.replace(/_/g, " ")
}

function Field({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: string | null | undefined
}) {
  return (
    <div className="border-b border-white/8 py-4 last:border-b-0">
      <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500">
        <Icon className="h-3.5 w-3.5" />
        <span>{label}</span>
      </div>
      <p className="mt-2 text-sm font-medium leading-6 text-white break-words">
        {value || <span className="text-slate-600">—</span>}
      </p>
    </div>
  )
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ key: string }>
}) {
  const user = await currentUser()
  if (!user) notFound()

  const { key } = await params
  const decodedKey = decodeURIComponent(key)

  const [partner] = await db
    .select()
    .from(partners)
    .where(eq(partners.authUserId, user.id))
    .limit(1)

  if (!partner) notFound()

  const [savedClientRows, leadRows, requestRows] = await Promise.all([
    db
      .select({
        id: partnerClients.id,
        companyName: partnerClients.companyName,
        contactName: partnerClients.contactName,
        email: partnerClients.email,
        phone: partnerClients.phone,
        nationality: partnerClients.nationality,
        tradeLicenseNumber: partnerClients.tradeLicenseNumber,
        city: partnerClients.city,
        country: partnerClients.country,
        status: partnerClients.status,
        renewalDate: partnerClients.renewalDate,
        notes: partnerClients.notes,
        createdAt: partnerClients.createdAt,
        updatedAt: partnerClients.updatedAt,
      })
      .from(partnerClients)
      .where(and(eq(partnerClients.partnerId, partner.id), isNull(partnerClients.deletedAt)))
      .orderBy(desc(partnerClients.createdAt)),
    db
      .select({
        id: leads.id,
        customerName: leads.customerName,
        customerEmail: leads.customerEmail,
        customerCompany: leads.customerCompany,
        status: leads.status,
        createdAt: leads.createdAt,
      })
      .from(leads)
      .where(and(eq(leads.partnerId, partner.id), isNull(leads.deletedAt)))
      .orderBy(desc(leads.createdAt)),
    db
      .select({
        id: serviceRequests.id,
        customerCompany: serviceRequests.customerCompany,
        customerContact: serviceRequests.customerContact,
        customerEmail: serviceRequests.customerEmail,
        serviceName: services.name,
        status: serviceRequests.status,
        createdAt: serviceRequests.createdAt,
      })
      .from(serviceRequests)
      .innerJoin(services, eq(serviceRequests.serviceId, services.id))
      .where(and(eq(serviceRequests.partnerId, partner.id), isNull(serviceRequests.deletedAt)))
      .orderBy(desc(serviceRequests.createdAt)),
  ])

  const clients = buildClientRecords(savedClientRows, leadRows, requestRows)
  const client = clients.find((row) => row.key === decodedKey)

  if (!client) notFound()

  const matchingLeads = leadRows.filter(
    (lead) =>
      buildClientKey(lead.customerEmail, lead.customerCompany, lead.customerName) ===
      client.key
  )

  const matchingRequests = requestRows.filter(
    (request) =>
      buildClientKey(
        request.customerEmail,
        request.customerCompany,
        request.customerContact
      ) === client.key
  )

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/dashboard/clients"
          className="inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to client book
        </Link>
      </div>

      <section className="surface-card rounded-[2rem] p-6 sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="eyebrow">
              {client.source === "saved" ? "Saved client" : "Activity-only client"}
            </div>
            <h1 className="page-title mt-4">{client.displayName}</h1>
            <p className="page-subtitle mt-3 max-w-2xl">
              Full client detail view with contact information, renewal tracking, and linked lead and service activity.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="metric-card min-w-[160px]">
              <p className="metric-value">{client.leadCount}</p>
              <p className="mt-2 text-sm font-semibold text-white">Leads</p>
            </div>
            <div className="metric-card min-w-[160px]">
              <p className="metric-value">{client.requestCount}</p>
              <p className="mt-2 text-sm font-semibold text-white">Service requests</p>
            </div>
            <div className="metric-card min-w-[160px]">
              <p className="metric-value text-lg">{formatDate(client.lastActivity)}</p>
              <p className="mt-2 text-sm font-semibold text-white">Last activity</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_420px]">
        <div className="space-y-6">
          <section className="surface-card rounded-[2rem] p-6 sm:p-7">
            <h2 className="font-heading text-2xl font-semibold text-white">Client details</h2>
            <p className="mt-1 text-sm leading-6 text-slate-400">
              The saved profile or best-known activity profile for this client.
            </p>

            <div className="mt-6 grid gap-x-8 md:grid-cols-2 xl:grid-cols-3">
              <Field icon={Building2} label="Company" value={client.displayName} />
              <Field icon={User} label="Primary contact" value={client.contactName} />
              <Field icon={Mail} label="Email" value={client.email} />
              <Field icon={Phone} label="Phone" value={client.phone} />
              <Field icon={User} label="Nationality" value={client.nationality} />
              <Field icon={Building2} label="Trade license number" value={client.tradeLicenseNumber} />
              <Field
                icon={MapPin}
                label="Location"
                value={[client.city, client.country].filter(Boolean).join(", ") || null}
              />
              <Field
                icon={Calendar}
                label="Renewal date"
                value={client.renewalDate ? formatDate(client.renewalDate) : "Not tracked"}
              />
              <Field
                icon={Globe}
                label="Client record type"
                value={client.source === "saved" ? "Saved client" : "Activity only"}
              />
              <Field
                icon={Globe}
                label="Lifecycle status"
                value={client.status ? formatLabel(client.status) : "Not set"}
              />
              <Field
                icon={Calendar}
                label="Renewal state"
                value={formatLabel(client.renewalState)}
              />
            </div>

            <div className="mt-6 border-t border-white/8 pt-6">
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500">
                Notes
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-200">
                {client.notes?.trim() || "No notes saved for this client yet."}
              </p>
            </div>
          </section>

          <section className="surface-card rounded-[2rem] p-6 sm:p-7">
            <h2 className="font-heading text-2xl font-semibold text-white">Lead activity</h2>
            <p className="mt-1 text-sm leading-6 text-slate-400">
              Every matched lead record associated with this client.
            </p>

            <div className="mt-6 space-y-4">
              {matchingLeads.length > 0 ? (
                matchingLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {lead.customerName || client.displayName}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Created {formatDate(lead.createdAt)}
                        </p>
                      </div>
                      <span className="status-pill border border-white/10 bg-white/[0.05] text-slate-200">
                        {formatLabel(lead.status)}
                      </span>
                    </div>
                    <div className="mt-4">
                      <Link
                        href={`/dashboard/leads/${lead.id}`}
                        className="tag-pill border-indigo-400/20 bg-indigo-500/10 text-indigo-100"
                      >
                        View lead
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No lead activity for this client.</p>
              )}
            </div>
          </section>

          <section className="surface-card rounded-[2rem] p-6 sm:p-7">
            <h2 className="font-heading text-2xl font-semibold text-white">Service activity</h2>
            <p className="mt-1 text-sm leading-6 text-slate-400">
              Recent service requests associated with this client.
            </p>

            <div className="mt-6 space-y-4">
              {matchingRequests.length > 0 ? (
                matchingRequests.map((request) => (
                  <div
                    key={request.id}
                    className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {request.serviceName}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Created {formatDate(request.createdAt)}
                        </p>
                      </div>
                      <span className="status-pill border border-white/10 bg-white/[0.05] text-slate-200">
                        {formatLabel(request.status)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No service activity for this client.</p>
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="surface-card rounded-[2rem] p-6">
            <h2 className="font-heading text-2xl font-semibold text-white">Snapshot</h2>
            <p className="mt-1 text-sm leading-6 text-slate-400">
              A quick read on what is happening with this client.
            </p>

            <div className="mt-6 grid gap-x-8 md:grid-cols-2 xl:grid-cols-1">
              <Field
                icon={Calendar}
                label="Renewal attention"
                value={formatLabel(client.renewalState)}
              />
              <Field
                icon={NotebookText}
                label="Lead activity"
                value={
                  client.latestLeadStatus
                    ? `${formatLabel(client.latestLeadStatus)} · ${client.leadCount} lead${client.leadCount === 1 ? "" : "s"}`
                    : "No lead activity"
                }
              />
              <Field
                icon={NotebookText}
                label="Service activity"
                value={
                  client.latestRequestStatus
                    ? `${formatLabel(client.latestRequestStatus)} · ${client.requestCount} request${client.requestCount === 1 ? "" : "s"}`
                    : "No service activity"
                }
              />
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
