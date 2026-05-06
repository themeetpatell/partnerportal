import { notFound } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { currentUser } from "@repo/auth/server"
import { AdminPartnerEditForm } from "@/components/admin-partner-edit-form"
import { PartnerCrmActivities } from "@/components/partner-crm-activities"
import { PartnerActionButton, PartnerRejectForm } from "@/components/partner-action-buttons"
import {
  db,
  derivePartnerOnboardingStage,
  derivePartnerOperationalStatus,
  documents,
  formatPartnerOnboardingStage,
  formatPartnerOperationalStatus,
  leads,
  commissions,
  partners,
  teamMembers,
} from "@repo/db"
import { eq, and, isNull, sum, asc } from "drizzle-orm"
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
  CreditCard,
  User,
  KeyRound,
  History,
} from "lucide-react"
import { getCurrentActiveTeamMember } from "@/lib/admin-auth"
import { getRequiredTenantId } from "@/lib/env"
import {
  getTeamRoleLabel,
  hasAnyTeamRole,
  PARTNER_OPERATIONS_ROLES,
  isPartnershipManagerAssignableRole,
  isPreSalesAssignableRole,
} from "@/lib/rbac"
import { isPartnerReadable, resolvePartnerScopeForActor } from "@/lib/row-scope"

function formatPaymentFrequencyLabel(value: string | null | undefined) {
  if (!value?.trim()) return "—"
  const map: Record<string, string> = {
    monthly: "Monthly",
    quarterly: "Quarterly",
    "bi-weekly": "Bi-weekly",
    "on-request": "On request",
  }
  return map[value] ?? value.replace(/-/g, " ")
}

function formatDateOfBirthDisplay(value: string | null | undefined) {
  if (!value?.trim()) return "—"
  const t = value.trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) {
    return new Date(t.slice(0, 10)).toLocaleDateString("en-AE", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }
  return t
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-yellow-950/60 border-yellow-800/40 text-yellow-400",
    approved: "bg-green-950/60 border-green-800/40 text-green-400",
    rejected: "bg-red-950/60 border-red-800/40 text-red-400",
    suspended: "bg-white/6 border-white/10 text-slate-400",
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
      className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border capitalize ${map[status] ?? "bg-white/6 border-white/10 text-slate-400"}`}
    >
      {status.replace("_", " ")}
    </span>
  )
}

function LifecycleBadge({
  label,
  tone,
}: {
  label: string
  tone: "indigo" | "emerald" | "amber" | "slate"
}) {
  const tones = {
    indigo: "bg-indigo-950/60 border-indigo-800/40 text-indigo-300",
    emerald: "bg-emerald-950/60 border-emerald-800/40 text-emerald-300",
    amber: "bg-amber-950/60 border-amber-800/40 text-amber-300",
    slate: "bg-white/6 border-white/10 text-slate-300",
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border capitalize ${tones[tone]}`}
    >
      {label}
    </span>
  )
}

export default async function PartnerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [member, actor] = await Promise.all([
    getCurrentActiveTeamMember(),
    currentUser(),
  ])
  const tenantId = getRequiredTenantId()
  const scope =
    actor?.id === undefined
      ? ({ kind: "restricted" as const, partnerIds: [] as readonly string[] })
      : await resolvePartnerScopeForActor({
          tenantId,
          actorUserId: actor.id,
          member,
        })

  const [partner] = await db
    .select()
    .from(partners)
    .where(and(eq(partners.id, id), eq(partners.tenantId, tenantId), isNull(partners.deletedAt)))
    .limit(1)

  if (!partner) notFound()
  if (!isPartnerReadable(scope, id)) notFound()

  const teamForPartner = await db
    .select({ id: teamMembers.id, name: teamMembers.name, role: teamMembers.role })
    .from(teamMembers)
    .where(and(eq(teamMembers.tenantId, tenantId), eq(teamMembers.isActive, true)))
    .orderBy(asc(teamMembers.name))

  const teamPicklists = {
    sdr: teamForPartner
      .filter((m) => isPreSalesAssignableRole(m.role))
      .map((m) => ({
        value: m.id,
        label: `${m.name} (${getTeamRoleLabel(m.role)})`,
      })),
    pm: teamForPartner
      .filter((m) => isPartnershipManagerAssignableRole(m.role))
      .map((m) => ({
        value: m.id,
        label: `${m.name} (${getTeamRoleLabel(m.role)})`,
      })),
  }

  const sdrAssignedLabel = partner.sdrTeamMemberId
    ? teamForPartner.find((r) => r.id === partner.sdrTeamMemberId)?.name ?? null
    : null
  const pmAssignedLabel = partner.partnershipManagerTeamMemberId
    ? teamForPartner.find((r) => r.id === partner.partnershipManagerTeamMemberId)?.name ?? null
    : null

  const [partnerDocs, partnerLeads, commissionsResult] = await Promise.all([
    db
      .select()
      .from(documents)
      .where(and(eq(documents.ownerType, "partner"), eq(documents.ownerId, id))),
    db
      .select()
      .from(leads)
      .where(and(eq(leads.partnerId, id), isNull(leads.deletedAt)))
      .orderBy(leads.createdAt)
      .limit(5),
    db
      .select({ total: sum(commissions.amount) })
      .from(commissions)
      .where(eq(commissions.partnerId, id)),
  ])

  const canManageCrmActivities = Boolean(
    member && hasAnyTeamRole(member.role, PARTNER_OPERATIONS_ROLES),
  )

  const totalCommissions = Number(commissionsResult[0]?.total ?? 0).toLocaleString(
    "en-AE",
    { minimumFractionDigits: 2, maximumFractionDigits: 2 }
  )
  const formatDate = (d: Date | null | undefined) =>
    d
      ? new Date(d).toLocaleDateString("en-AE", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : null

  const formatDateTimeStamp = (d: Date | null | undefined) =>
    d
      ? new Date(d).toLocaleDateString("en-AE", {
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      : null

  const fmtInput = (d: Date | null | undefined) =>
    d ? new Date(d).toISOString().slice(0, 10) : null

  const editablePartner = {
    id: partner.id,
    type: partner.type,
    companyName: partner.companyName,
    contactName: partner.contactName,
    email: partner.email,
    phone: partner.phone,
    designation: partner.designation,
    partnershipManager: partner.partnershipManager,
    appointmentsSetter: partner.appointmentsSetter,
    sdrTeamMemberId: partner.sdrTeamMemberId ?? "",
    partnershipManagerTeamMemberId: partner.partnershipManagerTeamMemberId ?? "",
    partnersId: partner.partnersId,
    strategicFunnelStage: partner.strategicFunnelStage,
    activationDate: fmtInput(partner.activationDate),
    lastMetOn: fmtInput(partner.lastMetOn),
    meetingScheduledDateAS: fmtInput(partner.meetingScheduledDateAS),
    partnershipLevel: partner.partnershipLevel,
    tier: partner.tier,
    agreementStartDate: fmtInput(partner.agreementStartDate),
    agreementEndDate: fmtInput(partner.agreementEndDate),
    salesTrainingDone: partner.salesTrainingDone,
    linkedinId: partner.linkedinId,
    website: partner.website,
    nationality: partner.nationality,
    businessSize: partner.businessSize,
    partnerIndustry: partner.partnerIndustry,
    overview: partner.overview,
    partnerAddress: partner.partnerAddress,
    dateOfBirth: partner.dateOfBirth,
    secondaryEmail: partner.secondaryEmail,
    emailOptOut: partner.emailOptOut,
    commissionType: partner.commissionType,
    commissionRate: partner.commissionRate,
    vatRegistered: partner.vatRegistered,
    vatNumber: partner.vatNumber,
    tradeLicense: partner.tradeLicense,
    emirateIdPassport: partner.emirateIdPassport,
    beneficiaryName: partner.beneficiaryName,
    bankName: partner.bankName,
    bankCountry: partner.bankCountry,
    accountNoIban: partner.accountNoIban,
    swiftBicCode: partner.swiftBicCode,
    paymentFrequency: partner.paymentFrequency,
  }

  const operationalStatus = derivePartnerOperationalStatus(
    {
      status: partner.status,
      contractStatus: partner.contractStatus,
      contractSignedAt: partner.contractSignedAt,
      onboardedAt: partner.onboardedAt,
    },
    partnerLeads.map((lead) => ({ status: lead.status, createdAt: lead.createdAt }))
  )

  const onboardingStage = derivePartnerOnboardingStage(
    {
      status: partner.status,
      meetingCompletedAt: partner.meetingCompletedAt,
      onboardedAt: partner.onboardedAt,
      nurturingStartedAt: partner.nurturingStartedAt,
    },
    partnerLeads.map((lead) => ({ createdAt: lead.createdAt }))
  )

  const operationalTone =
    operationalStatus === "active_partner"
      ? "emerald"
      : operationalStatus === "inactive_partner"
        ? "slate"
        : "amber"

  const onboardingTone =
    onboardingStage === "activated"
      ? "emerald"
      : onboardingStage === "yet_to_onboard"
        ? "amber"
        : "indigo"
  const onboardingSnapshotRows = [
    { label: "Partner type", value: partner.type?.replace("_", " ") },
    { label: "Company name", value: partner.companyName || "—" },
    { label: "Primary contact", value: partner.contactName },
    { label: "Business email", value: partner.email },
    { label: "Phone number", value: partner.phone },
    { label: "Submitted on", value: formatDate(partner.createdAt) },
  ]

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
          <div className="flex items-center gap-4">
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-white/5 text-white">
              {partner.profileImageUrl ? (
                <Image
                  src={partner.profileImageUrl}
                  alt={partner.companyName || partner.contactName}
                  fill
                  className="object-cover"
                  sizes="56px"
                  unoptimized
                />
              ) : (
                <User className="h-6 w-6 text-slate-400" />
              )}
            </div>
            <div>
            <h1 className="text-2xl font-bold text-white">
              {partner.companyName || partner.contactName}
            </h1>
            <p className="mt-1 text-[11px] text-slate-500">Partner ID: {partner.id}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <LifecycleBadge
                label={formatPartnerOperationalStatus(operationalStatus)}
                tone={operationalTone}
              />
              {onboardingStage !== "activated" && (
                <LifecycleBadge
                  label={formatPartnerOnboardingStage(onboardingStage)}
                  tone={onboardingTone}
                />
              )}
            </div>
            </div>
          </div>
          <StatusBadge status={partner.status} />
        </div>
      </div>

      {partner.status === "pending" && (
        <section className="surface-card rounded-2xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-white font-semibold">Onboarding Snapshot</h2>
              <p className="mt-1 text-[11px] leading-snug text-slate-500">
                Skim what they typed before you hit the big green button.
              </p>
            </div>
            <Users className="mt-0.5 h-5 w-5 text-indigo-300" />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {onboardingSnapshotRows.map((row) => (
              <div
                key={row.label}
                className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3"
              >
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  {row.label}
                </p>
                <p className="mt-1 text-sm font-medium text-white capitalize">
                  {row.value?.trim() ? row.value : "Not provided"}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Application / Access Actions */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {partner.status === "pending" && (
          <>
            <div className="surface-card rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-white font-semibold">Approve application</h2>
                  <p className="mt-1 text-[11px] leading-snug text-slate-500">
                    {"They're in—workspace unlocks on submit."}
                  </p>
                </div>
                <CheckCircle className="mt-0.5 h-5 w-5 text-green-400" />
              </div>
              <PartnerActionButton
                partnerId={partner.id}
                action="approve"
                endpoint={`/api/partners/${partner.id}/lifecycle`}
                label="Approve application"
                variant="green"
                icon="approve"
                extraBody={{ action: "approve" }}
              />
            </div>

            <div className="surface-card rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-white font-semibold">Reject application</h2>
                  <p className="mt-1 text-[11px] leading-snug text-slate-500">
                    Door stays shut; they get the email with why.
                  </p>
                </div>
                <XCircle className="mt-0.5 h-5 w-5 text-red-400" />
              </div>
              <PartnerRejectForm partnerId={partner.id} />
            </div>
          </>
        )}

        {partner.status === "approved" && (
          <>
            <div className="surface-card rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-white font-semibold">Partner agreement</h2>
                  <p className="mt-1 text-[11px] leading-snug text-slate-500">
                    The paperwork from onboarding—signatory said yes.
                  </p>
                </div>
                <CheckCircle className="mt-0.5 h-5 w-5 text-indigo-300" />
              </div>
              <p className="mt-4 text-sm text-slate-300">
                Signed on {formatDateTimeStamp(partner.contractSignedAt ?? partner.createdAt) || "—"}.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    Signed by
                  </p>
                  <p className="mt-1 text-sm font-medium text-white">
                    {partner.contractSignedName || partner.contactName}
                  </p>
                </div>
                <div className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    Signature mode
                  </p>
                  <p className="mt-1 text-sm font-medium text-white capitalize">
                    {partner.contractSignatureType || "typed"}
                  </p>
                </div>
              </div>
              {partner.contractSignatureDataUrl ? (
                <div className="mt-4 rounded-xl border border-white/8 bg-[#0b1020] p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 mb-4">
                    Authorized signatory signature
                  </p>
                  <div className="relative flex min-h-[120px] min-w-[200px] max-w-sm items-center rounded-xl border border-indigo-400/15 bg-indigo-500/6 px-4 py-4">
                    <Image
                      src={partner.contractSignatureDataUrl}
                      alt="Partner authorized signatory signature"
                      width={384}
                      height={160}
                      className="h-auto w-full rounded object-contain"
                      unoptimized
                    />
                  </div>
                </div>
              ) : null}
            </div>

            <div className="surface-card rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-white font-semibold">Suspend workspace access</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Pauses partner access without deleting the record and sends a suspension email.
                  </p>
                </div>
                <PauseCircle className="mt-0.5 h-5 w-5 text-slate-400" />
              </div>
              <PartnerRejectForm
                partnerId={partner.id}
                endpoint={`/api/partners/${partner.id}/lifecycle`}
                buttonLabel="Suspend partner"
              />
            </div>
          </>
        )}

        {(partner.status === "rejected" || partner.status === "suspended") && (
          <div className="surface-card rounded-2xl p-5 xl:col-span-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-white font-semibold">Restore workspace access</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Moves the partner back to approved, clears any pause state, and sends a
                  reactivation email.
                </p>
              </div>
              <RotateCcw className="mt-0.5 h-5 w-5 text-indigo-300" />
            </div>
            <PartnerActionButton
              partnerId={partner.id}
              action="reactivate"
              endpoint={`/api/partners/${partner.id}/lifecycle`}
              label="Reactivate access"
              variant="slate"
              icon="reactivate"
              extraBody={{ action: "reactivate" }}
            />
          </div>
        )}

        <div className="surface-card rounded-2xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-white font-semibold">Reset partner password</h2>
              <p className="mt-1 text-sm text-slate-400">
                Sends a password reset email to the partner so they can set a new portal password.
              </p>
            </div>
            <KeyRound className="mt-0.5 h-5 w-5 text-indigo-300" />
          </div>
          <PartnerActionButton
            partnerId={partner.id}
            action="reset_password"
            endpoint={`/api/partners/${partner.id}/reset-password`}
            label="Send reset email"
            confirmLabel={`Send a password reset email to ${partner.email}?`}
            variant="slate"
            icon="reset"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Company Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Primary Information */}
          <div className="surface-card rounded-2xl p-6">
            <AdminPartnerEditForm
              section="primary"
              partner={editablePartner}
              teamPicklists={teamPicklists}
              title={<h2 className="text-white font-semibold flex items-center gap-2"><Building2 className="w-4 h-4 text-slate-400" />Primary Information</h2>}
            >
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <dt className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                  Company Name
                </dt>
                <dd className="text-white text-sm">{partner.companyName || "—"}</dd>
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
                  Designation
                </dt>
                <dd className="text-white text-sm">{partner.designation || "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                  Registered Address
                </dt>
                <dd className="text-white text-sm">{partner.partnerAddress || "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                  Partnership Manager
                </dt>
                <dd className="text-white text-sm">
                  {(pmAssignedLabel ?? partner.partnershipManager) || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                  Partnership executive
                </dt>
                <dd className="text-white text-sm">
                  {(sdrAssignedLabel ?? partner.appointmentsSetter) || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                  Partners ID
                </dt>
                <dd className="text-white text-sm">{partner.partnersId || "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                  Strategic Funnel Stage
                </dt>
                <dd className="text-white text-sm">{partner.strategicFunnelStage || "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                  Registered
                </dt>
                <dd className="text-white text-sm flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  {formatDate(partner.createdAt)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                  Onboarding Date
                </dt>
                <dd className="text-white text-sm">{formatDate(partner.onboardedAt) || "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                  Activation Date
                </dt>
                <dd className="text-white text-sm">{formatDate(partner.activationDate) || "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                  Last Met On
                </dt>
                <dd className="text-white text-sm">{formatDate(partner.lastMetOn) || "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                  Meeting scheduled
                </dt>
                <dd className="text-white text-sm">{formatDate(partner.meetingScheduledDateAS) || "—"}</dd>
              </div>
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
              {partner.suspensionReason && (
                <div className="sm:col-span-2">
                  <dt className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                    Suspension Reason
                  </dt>
                  <dd className="text-slate-300 text-sm">{partner.suspensionReason}</dd>
                </div>
              )}
            </dl>
            </AdminPartnerEditForm>
          </div>

          {/* Secondary Information */}
          <div className="surface-card rounded-2xl p-6">
            <AdminPartnerEditForm
              section="secondary"
              partner={editablePartner}
              title={<h2 className="text-white font-semibold flex items-center gap-2"><FileText className="w-4 h-4 text-slate-400" />Secondary Information</h2>}
            >
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <dt className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                  Onboarding terms acknowledged
                </dt>
                <dd className="text-white text-sm">{partner.contractSignedAt ? "Yes" : "Pending"}</dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                  Acknowledged On
                </dt>
                <dd className="text-white text-sm">{formatDate(partner.contractSignedAt ?? partner.createdAt) || "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                  Signed By
                </dt>
                <dd className="text-white text-sm">{partner.contractSignedName || partner.contactName || "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                  Signature Mode
                </dt>
                <dd className="text-white text-sm capitalize">{partner.contractSignatureType || "typed"}</dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                  Partnership Level
                </dt>
                <dd className="text-white text-sm capitalize">{partner.partnershipLevel || partner.tier || "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                  LinkedIn ID
                </dt>
                <dd className="text-white text-sm">{partner.linkedinId || "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                  Agreement Start Date
                </dt>
                <dd className="text-white text-sm">{formatDate(partner.agreementStartDate) || "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                  Agreement End Date
                </dt>
                <dd className="text-white text-sm">{formatDate(partner.agreementEndDate) || "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                  Sales Training Done
                </dt>
                <dd className="text-white text-sm">{partner.salesTrainingDone ? "Yes" : "No"}</dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                  Partner Industry
                </dt>
                <dd className="text-white text-sm">{partner.partnerIndustry || "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                  Date of Birth
                </dt>
                <dd className="text-white text-sm">{formatDateOfBirthDisplay(partner.dateOfBirth)}</dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                  Nationality
                </dt>
                <dd className="text-white text-sm">{partner.nationality || "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                  Business Size
                </dt>
                <dd className="text-white text-sm capitalize">{partner.businessSize || "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                  Secondary Email
                </dt>
                <dd className="text-white text-sm">{partner.secondaryEmail || "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                  Partner Website
                </dt>
                <dd className="text-white text-sm">{partner.website || "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                  Email Opt Out
                </dt>
                <dd className="text-white text-sm">{partner.emailOptOut ? "Yes" : "No"}</dd>
              </div>
              {partner.overview && (
                <div className="sm:col-span-2">
                  <dt className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                    Overview
                  </dt>
                  <dd className="text-white text-sm">{partner.overview}</dd>
                </div>
              )}
            </dl>
            </AdminPartnerEditForm>
          </div>

          {/* Financial Information */}
          <div className="surface-card rounded-2xl p-6">
            <AdminPartnerEditForm
              section="financial"
              partner={editablePartner}
              title={<h2 className="text-white font-semibold flex items-center gap-2"><CreditCard className="w-4 h-4 text-slate-400" />Financial Information</h2>}
            >
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <dt className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                  Commission Type
                </dt>
                <dd className="text-white text-sm capitalize">{partner.commissionType || "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                  Commission Rate
                </dt>
                <dd className="text-white text-sm">{partner.commissionRate ? `${partner.commissionRate}%` : "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                  VAT Registered
                </dt>
                <dd className="text-white text-sm">{partner.vatRegistered ? "Yes" : "No"}</dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                  VAT Number
                </dt>
                <dd className="text-white text-sm">{partner.vatNumber || "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                  Trade License
                </dt>
                <dd className="text-white text-sm">{partner.tradeLicense || "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                  Beneficiary Name
                </dt>
                <dd className="text-white text-sm">{partner.beneficiaryName || "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                  Bank Name
                </dt>
                <dd className="text-white text-sm">{partner.bankName || "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                  Bank Country
                </dt>
                <dd className="text-white text-sm">{partner.bankCountry || "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                  Account No / IBAN
                </dt>
                <dd className="text-white text-sm">{partner.accountNoIban || "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                  SWIFT / BIC Code
                </dt>
                <dd className="text-white text-sm">{partner.swiftBicCode || "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                  Payment Frequency
                </dt>
                <dd className="text-white text-sm">{formatPaymentFrequencyLabel(partner.paymentFrequency)}</dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                  Emirate ID / Passport
                </dt>
                <dd className="text-white text-sm">{partner.emirateIdPassport || "—"}</dd>
              </div>
            </dl>
            </AdminPartnerEditForm>
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
                            lead_approved:
                              "bg-sky-950/60 border-sky-800/40 text-sky-400",
                            lead_follow_up:
                              "bg-cyan-950/60 border-cyan-800/40 text-cyan-400",
                            lead_qualified:
                              "bg-indigo-950/60 border-indigo-800/40 text-indigo-400",
                            proposal_sent:
                              "bg-yellow-950/60 border-yellow-800/40 text-yellow-400",
                            deal_won:
                              "bg-green-950/60 border-green-800/40 text-green-400",
                            deal_lost:
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

          <div className="surface-card rounded-2xl p-6">
            <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
              <History className="w-4 h-4 text-slate-400" />
              CRM activities
            </h2>
            <PartnerCrmActivities
              partnerId={partner.id}
              canManage={canManageCrmActivities}
              assignees={teamForPartner.map((m) => ({ id: m.id, name: m.name }))}
            />
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
                    href={
                      doc.storageProvider === "database"
                        ? `/api/documents/${doc.id}/download`
                        : doc.zohoWorkdriveUrl
                    }
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
