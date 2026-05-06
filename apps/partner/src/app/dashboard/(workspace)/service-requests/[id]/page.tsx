import Link from "next/link"
import { notFound } from "next/navigation"
import { db, leads, serviceRequests } from "@repo/db"
import { and, eq, isNull } from "drizzle-orm"
import { ArrowLeft, Building2, ClipboardList, Mail, User } from "lucide-react"
import { getCurrentPartnerRecord } from "@/lib/partner-record"

function parseServicesList(value: string | null | undefined) {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      : []
  } catch {
    return []
  }
}

const requestStatusStyles: Record<string, string> = {
  pending: "border border-amber-500/25 bg-amber-500/10 text-amber-700 dark:border-amber-400/25 dark:text-amber-100",
  in_progress: "border border-sky-500/25 bg-sky-500/10 text-sky-700 dark:border-sky-400/25 dark:text-sky-100",
  completed: "border border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/25 dark:text-emerald-100",
  cancelled: "border border-border bg-secondary/60 text-muted-foreground",
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—"
  const parsed = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(parsed.getTime())) return "—"
  return parsed.toLocaleDateString("en-AE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

export default async function PartnerServiceRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const partner = await getCurrentPartnerRecord()
  if (!partner) {
    notFound()
  }

  const [row] = await db
    .select({
      id: serviceRequests.id,
      customerCompany: serviceRequests.customerCompany,
      customerContact: serviceRequests.customerContact,
      customerEmail: serviceRequests.customerEmail,
      servicesList: serviceRequests.servicesList,
      status: serviceRequests.status,
      notes: serviceRequests.notes,
      createdAt: serviceRequests.createdAt,
      parentLeadId: leads.id,
      parentLeadName: leads.customerName,
      parentLeadStatus: leads.status,
    })
    .from(serviceRequests)
    .leftJoin(leads, eq(serviceRequests.leadId, leads.id))
    .where(
      and(
        eq(serviceRequests.id, id),
        eq(serviceRequests.partnerId, partner.id),
        isNull(serviceRequests.deletedAt),
      ),
    )
    .limit(1)

  if (!row) {
    notFound()
  }

  const services = parseServicesList(row.servicesList)

  return (
    <div className="space-y-8">
      <section className="surface-card rounded-[2rem] p-6 sm:p-8">
        <Link
          href="/dashboard/leads?kind=cross_sell"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to cross-sell referrals
        </Link>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="eyebrow">Cross-sell · existing client</div>
            <h1 className="page-title mt-4">{row.customerCompany}</h1>
            <p className="page-subtitle mt-3 max-w-2xl">
              Follow-on services for a closed deal you referred. Finanshels will update status as the request moves.
            </p>
          </div>
          <span
            className={`status-pill shrink-0 capitalize ${requestStatusStyles[row.status] ?? "border border-border bg-secondary/70 text-[var(--portal-text-soft)]"}`}
          >
            {row.status.replace(/_/g, " ")}
          </span>
        </div>

        <dl className="mt-10 grid gap-6 sm:grid-cols-2">
          <div className="flex gap-3">
            <User className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Contact</dt>
              <dd className="mt-1 text-foreground">{row.customerContact}</dd>
            </div>
          </div>
          <div className="flex gap-3">
            <Mail className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Email</dt>
              <dd className="mt-1 text-foreground">{row.customerEmail}</dd>
            </div>
          </div>
          <div className="flex gap-3 sm:col-span-2">
            <ClipboardList className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Services</dt>
              <dd className="mt-2 flex flex-wrap gap-2">
                {services.length > 0 ? (
                  services.map((s) => (
                    <span
                      key={s}
                      className="status-pill border border-border bg-secondary/70 text-[var(--portal-text-soft)]"
                    >
                      {s}
                    </span>
                  ))
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </dd>
            </div>
          </div>
          <div className="flex gap-3 sm:col-span-2">
            <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Original deal</dt>
              <dd className="mt-1">
                {row.parentLeadId ? (
                  <Link href={`/dashboard/leads/${row.parentLeadId}`} className="font-medium text-primary hover:text-primary/80">
                    {row.parentLeadName ?? "Original lead"}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      ({(row.parentLeadStatus ?? "—").replace(/_/g, " ")})
                    </span>
                  </Link>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </dd>
            </div>
          </div>
          {row.notes ? (
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Your notes</dt>
              <dd className="mt-2 whitespace-pre-wrap text-sm text-foreground">{row.notes}</dd>
            </div>
          ) : null}
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Submitted</dt>
            <dd className="mt-1 text-foreground">{formatDate(row.createdAt)}</dd>
          </div>
        </dl>
      </section>
    </div>
  )
}
