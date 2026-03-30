import { currentUser } from "@clerk/nextjs/server"
import { auth } from "@clerk/nextjs/server"
import { db, partners } from "@repo/db"
import { eq } from "drizzle-orm"
import {
  BadgeCheck,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Hash,
  Mail,
  Phone,
  ShieldCheck,
  User,
} from "lucide-react"

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    approved: {
      label: "Active",
      cls: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
    },
    pending: {
      label: "Pending review",
      cls: "border-indigo-400/20 bg-indigo-500/12 text-indigo-200",
    },
    rejected: {
      label: "Rejected",
      cls: "border-rose-400/20 bg-rose-400/10 text-rose-300",
    },
    suspended: {
      label: "Suspended",
      cls: "border-white/10 bg-white/5 text-slate-400",
    },
  }
  const entry = map[status] ?? map.suspended
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${entry!.cls}`}
    >
      {entry!.label}
    </span>
  )
}

function FieldRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: string | null | undefined
}) {
  return (
    <div className="flex items-start gap-4 rounded-[1.4rem] border border-white/8 bg-white/[0.03] px-5 py-4">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/6 text-slate-400">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500">
          {label}
        </p>
        <p className="mt-1 text-sm font-medium text-white break-all">
          {value || <span className="text-slate-600">—</span>}
        </p>
      </div>
    </div>
  )
}

export default async function ProfilePage() {
  const [user, { userId }] = await Promise.all([currentUser(), auth()])

  const fullName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Partner"

  const partnerRecord = userId
    ? await db
        .select()
        .from(partners)
        .where(eq(partners.clerkUserId, userId))
        .limit(1)
        .then((rows) => rows[0] ?? null)
    : null

  const partnerTypeLabel =
    partnerRecord?.type === "channel" ? "Channel Partner" : "Referral Partner"

  const formatDate = (d: Date | null | undefined) =>
    d
      ? new Date(d).toLocaleDateString("en-AE", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : null

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-title">Profile</h1>
      </div>

      <section>
        <div className="surface-card rounded-[2rem] p-6 sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[1.8rem] bg-gradient-to-br from-white/20 to-white/8 text-white">
              <User className="h-9 w-9" />
            </div>
            <div>
              <h2 className="font-heading text-3xl font-semibold text-white">{fullName}</h2>
              <p className="mt-1 text-sm text-slate-400">
                {user?.emailAddresses[0]?.emailAddress || "No email available"}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="tag-pill">
                  <BadgeCheck className="h-4 w-4 text-white" />
                  Verified partner identity
                </span>
                {partnerRecord && <StatusBadge status={partnerRecord.status} />}
              </div>
            </div>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <FieldRow
              icon={Mail}
              label="Email"
              value={user?.emailAddresses[0]?.emailAddress}
            />
            <FieldRow
              icon={Hash}
              label="Account ID"
              value={user?.id}
            />
          </div>
        </div>
      </section>

      {partnerRecord ? (
        <section className="surface-card rounded-[2rem] p-6 sm:p-7">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/6 text-white">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-heading text-2xl font-semibold text-white">
                  Partner record
                </h2>
                <p className="mt-0.5 text-sm text-slate-400">
                  Your commercial profile as registered with Finanshels.
                </p>
              </div>
            </div>
            <StatusBadge status={partnerRecord.status} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <FieldRow
              icon={Building2}
              label="Partner organisation"
              value={partnerRecord.companyName}
            />
            <FieldRow
              icon={User}
              label="Primary contact"
              value={partnerRecord.contactName}
            />
            <FieldRow
              icon={Mail}
              label="Business email"
              value={partnerRecord.email}
            />
            <FieldRow
              icon={Phone}
              label="Phone"
              value={partnerRecord.phone}
            />
            <FieldRow
              icon={ShieldCheck}
              label="Partner type"
              value={partnerTypeLabel}
            />
            <FieldRow
              icon={Calendar}
              label="Registered on"
              value={formatDate(partnerRecord.createdAt)}
            />
            {partnerRecord.onboardedAt && (
              <FieldRow
                icon={CheckCircle2}
                label="Onboarded on"
                value={formatDate(partnerRecord.onboardedAt)}
              />
            )}
            {partnerRecord.zohoContactId && (
              <FieldRow
                icon={Hash}
                label="CRM contact ID"
                value={partnerRecord.zohoContactId}
              />
            )}
            {partnerRecord.rejectionReason && (
              <div className="sm:col-span-2 lg:col-span-3 rounded-[1.4rem] border border-rose-400/20 bg-rose-400/10 px-5 py-4">
                <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-rose-400">
                  Rejection reason
                </p>
                <p className="mt-1 text-sm text-rose-200">
                  {partnerRecord.rejectionReason}
                </p>
              </div>
            )}
          </div>
        </section>
      ) : (
        /* No partner record yet */
        <section className="empty-state">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/8 text-slate-400">
            <Clock className="h-6 w-6" />
          </div>
          <p className="text-sm font-medium text-slate-300">No partner record found</p>
          <p className="mt-1 text-xs text-slate-500">
            Complete the registration flow to create your partner record.
          </p>
        </section>
      )}
    </div>
  )
}
