import {
  db,
  leads,
  partnerClients,
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
  Sparkles,
  User,
} from "lucide-react"
import { buildClientKey, buildClientRecords } from "@/lib/client-records"
import { getCurrentPartnerRecord } from "@/lib/partner-record"
import { ClientEditCard } from "@/components/client-edit-card"

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
    <div className="border-b border-border py-4 last:border-b-0">
      <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span>{label}</span>
      </div>
      <p className="mt-2 text-sm font-medium leading-6 text-foreground break-words">
        {value || <span className="text-muted-foreground/60">—</span>}
      </p>
    </div>
  )
}

function HeroStat({
  label,
  value,
  description,
}: {
  label: string
  value: string | number
  description: string
}) {
  return (
    <div className="rounded-2xl border border-border bg-secondary/40 px-4 py-4">
      <p className="font-heading text-2xl font-semibold text-foreground">{value}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{label}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
    </div>
  )
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ key: string }>
}) {
  const { key } = await params
  const decodedKey = decodeURIComponent(key)
  const partner = await getCurrentPartnerRecord()

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
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to client book
        </Link>
      </div>

      <section className="surface-card overflow-hidden rounded-[2rem] p-0">
        <div className="border-b border-border bg-secondary/25 px-6 py-7 sm:px-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="eyebrow">
                {client.source === "saved" ? "Saved client" : "Activity-only client"}
              </div>
              <h1 className="page-title mt-4">{client.displayName}</h1>
              <p className="page-subtitle mt-3 max-w-2xl">
                Client profile, renewal status, and every linked lead or service request in one working view.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-2 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" />
              {client.source === "saved" ? "Editable profile" : "Save to edit"}
            </div>
          </div>
        </div>
        <div className="grid gap-3 px-6 py-5 sm:grid-cols-3 sm:px-7">
          <HeroStat label="Leads" value={client.leadCount} description="Matched lead records" />
          <HeroStat label="Service requests" value={client.requestCount} description="Linked delivery work" />
          <HeroStat label="Last activity" value={formatDate(client.lastActivity)} description="Most recent touchpoint" />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_420px]">
        <div className="space-y-6">
          <section className="surface-card rounded-[2rem] p-6 sm:p-7">
            {client.source === "saved" && client.clientId ? (
              <ClientEditCard
                client={{
                  id: client.clientId,
                  companyName: client.displayName,
                  contactName: client.contactName,
                  email: client.email,
                  phone: client.phone,
                  nationality: client.nationality,
                  tradeLicenseNumber: client.tradeLicenseNumber,
                  city: client.city,
                  country: client.country,
                  status: client.status,
                  renewalDate: client.renewalDate ? client.renewalDate.toISOString() : null,
                  renewalState: client.renewalState,
                  notes: client.notes,
                }}
              />
            ) : (
              <>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="font-heading text-2xl font-semibold text-foreground">Client details</h2>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      Best-known activity profile for this client.
                    </p>
                  </div>
                  <Link href={`/dashboard/clients/new?company=${encodeURIComponent(client.displayName)}`} className="primary-button h-10 px-4">
                    Save client
                  </Link>
                </div>

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
                  <Field icon={Globe} label="Client record type" value="Activity only" />
                </div>
              </>
            )}
          </section>

          <section className="surface-card rounded-[2rem] p-6 sm:p-7">
            <h2 className="font-heading text-2xl font-semibold text-foreground">Lead activity</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Every matched lead record associated with this client.
            </p>

            <div className="mt-6 space-y-4">
              {matchingLeads.length > 0 ? (
                matchingLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="rounded-[1.4rem] border border-border bg-secondary/50 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {lead.customerName || client.displayName}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Created {formatDate(lead.createdAt)}
                        </p>
                      </div>
                      <span className="status-pill border border-border bg-secondary/70 text-foreground/90">
                        {formatLabel(lead.status)}
                      </span>
                    </div>
                    <div className="mt-4">
                      <Link
                        href={`/dashboard/leads/${lead.id}`}
                        className="tag-pill border-primary/20 bg-primary/10 text-primary"
                      >
                        View lead
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No lead activity for this client.</p>
              )}
            </div>
          </section>

          <section className="surface-card rounded-[2rem] p-6 sm:p-7">
            <h2 className="font-heading text-2xl font-semibold text-foreground">Service activity</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Recent service requests associated with this client.
            </p>

            <div className="mt-6 space-y-4">
              {matchingRequests.length > 0 ? (
                matchingRequests.map((request) => (
                  <div
                    key={request.id}
                    className="rounded-[1.4rem] border border-border bg-secondary/50 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {request.serviceName}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Created {formatDate(request.createdAt)}
                        </p>
                      </div>
                      <span className="status-pill border border-border bg-secondary/70 text-foreground/90">
                        {formatLabel(request.status)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No service activity for this client.</p>
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="surface-card rounded-[2rem] p-6">
            <h2 className="font-heading text-2xl font-semibold text-foreground">Snapshot</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
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
