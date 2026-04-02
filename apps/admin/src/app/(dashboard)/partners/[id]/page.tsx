import { notFound } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { AdminPartnerEditForm } from "@/components/admin-partner-edit-form"
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
} from "@repo/db"
import { eq, and, isNull, sum } from "drizzle-orm"
import {
  Building2,
  FileSignature,
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

function getWorkspaceAccessState(status: string) {
  switch (status) {
    case "approved":
      return {
        label: "active access",
        tone: "emerald" as const,
        description: "The partner can use the revenue workspace and operate normally.",
      }
    case "pending":
      return {
        label: "locked pending review",
        tone: "amber" as const,
        description:
          "The account can sign in and finish onboarding, but revenue features stay locked.",
      }
    case "rejected":
      return {
        label: "access denied",
        tone: "slate" as const,
        description: "The application was declined and workspace access remains disabled.",
      }
    case "suspended":
      return {
        label: "access paused",
        tone: "slate" as const,
        description: "The partner record remains in the system, but workspace access is paused.",
      }
    default:
      return {
        label: "access unknown",
        tone: "slate" as const,
        description: "The workspace access state is not recognized.",
      }
  }
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
      .where(and(eq(leads.partnerId, id), isNull(leads.deletedAt)))
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
  const signedAgreementDoc = partnerDocs.find(
    (doc) => doc.documentType === "signed_agreement_pdf"
  )

  const formatDate = (d: Date | null | undefined) =>
    d
      ? new Date(d).toLocaleDateString("en-AE", {
          day: "numeric",
          month: "long",
          year: "numeric",
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
    partnersId: partner.partnersId,
    strategicFunnelStage: partner.strategicFunnelStage,
    activationDate: fmtInput(partner.activationDate),
    lastMetOn: fmtInput(partner.lastMetOn),
    meetingScheduledDateAS: fmtInput(partner.meetingScheduledDateAS),
    meetingDatePM: fmtInput(partner.meetingDatePM),
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
      contractStatus: partner.contractStatus,
      contractSignedAt: partner.contractSignedAt,
      onboardedAt: partner.onboardedAt,
    },
    partnerLeads.map((lead) => ({ status: lead.status, createdAt: lead.createdAt }))
  )

  const onboardingStage = derivePartnerOnboardingStage(
    {
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
  const workspaceAccess = getWorkspaceAccessState(partner.status)

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
            <div className="mt-3 flex flex-wrap gap-2">
              <LifecycleBadge
                label={formatPartnerOperationalStatus(operationalStatus)}
                tone={operationalTone}
              />
              <LifecycleBadge
                label={formatPartnerOnboardingStage(onboardingStage)}
                tone={onboardingTone}
              />
            </div>
          </div>
          <StatusBadge status={partner.status} />
        </div>
      </div>

      {/* Application / Access Actions */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {partner.status === "pending" && (
          <>
            <form
              action={`/api/partners/${partner.id}/lifecycle`}
              method="POST"
              className="surface-card rounded-2xl p-5"
            >
              <input type="hidden" name="action" value="approve" />
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-white font-semibold">Approve and activate workspace</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Marks the application as approved, unlocks partner access, and sends the
                    activation email immediately.
                  </p>
                </div>
                <CheckCircle className="mt-0.5 h-5 w-5 text-green-400" />
              </div>
              <button
                type="submit"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-500"
              >
                <CheckCircle className="h-4 w-4" />
                Approve and activate
              </button>
            </form>

            <form
              action={`/api/partners/${partner.id}/reject`}
              method="POST"
              className="surface-card rounded-2xl p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-white font-semibold">Reject application</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Keeps the workspace locked and emails the applicant with the review outcome.
                  </p>
                </div>
                <XCircle className="mt-0.5 h-5 w-5 text-red-400" />
              </div>
              <label className="mt-4 block">
                <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                  Optional rejection reason
                </span>
                <textarea
                  name="reason"
                  rows={3}
                  placeholder="Explain why the application cannot be approved right now."
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400/40 focus:outline-none"
                />
              </label>
              <button
                type="submit"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500"
              >
                <XCircle className="h-4 w-4" />
                Reject application
              </button>
            </form>
          </>
        )}

        {partner.status === "approved" && (
          <form
            action={`/api/partners/${partner.id}/lifecycle`}
            method="POST"
            className="surface-card rounded-2xl p-5 xl:col-span-2"
          >
            <input type="hidden" name="action" value="suspend" />
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-white font-semibold">Suspend workspace access</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Pauses partner access without deleting the record and sends a suspension email.
                </p>
              </div>
              <PauseCircle className="mt-0.5 h-5 w-5 text-slate-400" />
            </div>
            <label className="mt-4 block max-w-2xl">
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                Optional suspension reason
              </span>
              <textarea
                name="reason"
                rows={3}
                placeholder="Capture why access is being paused."
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400/40 focus:outline-none"
              />
            </label>
            <button
              type="submit"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-zinc-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-600"
            >
              <PauseCircle className="h-4 w-4" />
              Suspend access
            </button>
          </form>
        )}

        {(partner.status === "rejected" || partner.status === "suspended") && (
          <form
            action={`/api/partners/${partner.id}/lifecycle`}
            method="POST"
            className="surface-card rounded-2xl p-5 xl:col-span-2"
          >
            <input type="hidden" name="action" value="reactivate" />
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
            <button
              type="submit"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-400"
            >
              <RotateCcw className="h-4 w-4" />
              Reactivate access
            </button>
          </form>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="surface-card rounded-2xl p-6">
          <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
            Application decision
          </p>
          <div className="mt-2">
            <StatusBadge status={partner.status} />
          </div>
          <p className="mt-3 text-sm text-slate-400">
            {partner.status === "pending"
              ? "Awaiting admin review before partner access can be activated."
              : partner.status === "approved"
                ? "Approved by the partnerships team."
                : partner.status === "rejected"
                  ? "Application was declined."
                  : "Application remains on file, but access is currently paused."}
          </p>
        </div>
        <div className="surface-card rounded-2xl p-6">
          <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
            Workspace access
          </p>
          <div className="mt-2">
            <LifecycleBadge
              label={workspaceAccess.label}
              tone={workspaceAccess.tone}
            />
          </div>
          <p className="mt-3 text-sm text-slate-400">{workspaceAccess.description}</p>
        </div>
        <div className="surface-card rounded-2xl p-6">
          <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
            Onboarding stage
          </p>
          <div className="mt-2">
            <LifecycleBadge
              label={formatPartnerOnboardingStage(onboardingStage)}
              tone={onboardingTone}
            />
          </div>
          <p className="mt-3 text-sm text-slate-400">
            Tracks contract, onboarding, and operational readiness inside the workspace.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="surface-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <FileSignature className="w-4 h-4 text-slate-400" />
            <h2 className="text-white font-semibold">Contract And Onboarding</h2>
          </div>
          <div className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
            <p className="text-slate-500 text-xs uppercase tracking-wider">Contract delivery</p>
            <p className="mt-2">
              Contracts are hosted inside the partner portal and signed there.
            </p>
            {partner.contractSentAt && (
              <p className="mt-2">
                Sent on:{" "}
                <span className="text-white">
                  {new Date(partner.contractSentAt).toLocaleDateString("en-AE")}
                </span>
              </p>
            )}
            {partner.agreementUrl && (
              <p className="mt-2 break-all">
                Agreement:{" "}
                <a
                  href={partner.agreementUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-300 hover:text-indigo-200"
                >
                  Open agreement file
                </a>
              </p>
            )}
            {signedAgreementDoc && (
              <p className="mt-2">
                Signed PDF:{" "}
                <a
                  href={`/api/documents/${signedAgreementDoc.id}/download`}
                  className="text-indigo-300 hover:text-indigo-200"
                >
                  Download signed PDF
                </a>
              </p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-1">
            <form action={`/api/partners/${partner.id}/lifecycle`} method="POST">
              <input type="hidden" name="action" value="send_contract" />
              <button
                type="submit"
                disabled={partner.contractStatus === "signed"}
                className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600"
              >
                Send contract
              </button>
            </form>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <form action={`/api/partners/${partner.id}/lifecycle`} method="POST">
              <input type="hidden" name="action" value="mark_meeting_done" />
              <button
                type="submit"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition-colors"
              >
                Mark meeting done
              </button>
            </form>

            <form action={`/api/partners/${partner.id}/lifecycle`} method="POST">
              <input type="hidden" name="action" value="start_nurturing" />
              <button
                type="submit"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition-colors"
              >
                Start nurturing
              </button>
            </form>

            <form action={`/api/partners/${partner.id}/lifecycle`} method="POST" className="sm:col-span-2">
              <input type="hidden" name="action" value="mark_onboarded" />
              <button
                type="submit"
                disabled={!partner.contractSignedAt}
                className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600"
              >
                Mark onboarded
              </button>
            </form>
          </div>
        </div>

        <div className="surface-card rounded-2xl p-6">
          <h2 className="text-white font-semibold mb-4">Lifecycle Timeline</h2>
          <div className="space-y-3 text-sm">
            <div className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">
              <p className="text-slate-500 text-xs uppercase tracking-wider">Contract status</p>
              <p className="mt-1 text-white capitalize">{partner.contractStatus.replaceAll("_", " ")}</p>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">
              <p className="text-slate-500 text-xs uppercase tracking-wider">Contract signed</p>
              <p className="mt-1 text-white">
                {partner.contractSignedAt
                  ? new Date(partner.contractSignedAt).toLocaleDateString("en-AE")
                  : "Pending partner signature"}
              </p>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">
              <p className="text-slate-500 text-xs uppercase tracking-wider">Contract sent</p>
              <p className="mt-1 text-white">
                {partner.contractSentAt
                  ? new Date(partner.contractSentAt).toLocaleDateString("en-AE")
                  : "Not sent"}
              </p>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">
              <p className="text-slate-500 text-xs uppercase tracking-wider">Signed by</p>
              <p className="mt-1 text-white">
                {partner.contractSignedName || "Pending signature"}
              </p>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">
              <p className="text-slate-500 text-xs uppercase tracking-wider">Signature method</p>
              <p className="mt-1 text-white capitalize">
                {partner.contractSignatureType || "Not captured"}
              </p>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">
              <p className="text-slate-500 text-xs uppercase tracking-wider">Signed designation</p>
              <p className="mt-1 text-white">
                {partner.contractSignedDesignation || "Not provided"}
              </p>
            </div>
            {partner.contractSignatureType === "upload" &&
              partner.contractSignatureDataUrl && (
                <div className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">
                  <p className="text-slate-500 text-xs uppercase tracking-wider">
                    Uploaded signature
                  </p>
                  <Image
                    src={partner.contractSignatureDataUrl}
                    alt="Partner signature"
                    width={160}
                    height={80}
                    unoptimized
                    className="mt-3 max-h-24 rounded-lg bg-white p-2"
                  />
                </div>
              )}
            <div className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">
              <p className="text-slate-500 text-xs uppercase tracking-wider">Meeting completed</p>
              <p className="mt-1 text-white">
                {partner.meetingCompletedAt
                  ? new Date(partner.meetingCompletedAt).toLocaleDateString("en-AE")
                  : "Not recorded"}
              </p>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">
              <p className="text-slate-500 text-xs uppercase tracking-wider">Onboarded</p>
              <p className="mt-1 text-white">
                {partner.onboardedAt
                  ? new Date(partner.onboardedAt).toLocaleDateString("en-AE")
                  : "Pending"}
              </p>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">
              <p className="text-slate-500 text-xs uppercase tracking-wider">Nurturing</p>
              <p className="mt-1 text-white">
                {partner.nurturingStartedAt
                  ? new Date(partner.nurturingStartedAt).toLocaleDateString("en-AE")
                  : "Not started"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Company Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Primary Information */}
          <div className="surface-card rounded-2xl p-6">
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-400" />
              Primary Information
            </h2>
            <AdminPartnerEditForm section="primary" partner={editablePartner}>
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
                  Designation
                </dt>
                <dd className="text-white text-sm">{partner.designation || "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                  Partnership Manager
                </dt>
                <dd className="text-white text-sm">{partner.partnershipManager || "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                  Appointments Setter
                </dt>
                <dd className="text-white text-sm">{partner.appointmentsSetter || "—"}</dd>
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
                  Meeting Scheduled (AS)
                </dt>
                <dd className="text-white text-sm">{formatDate(partner.meetingScheduledDateAS) || "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                  Meeting Date (PM)
                </dt>
                <dd className="text-white text-sm">{formatDate(partner.meetingDatePM) || "—"}</dd>
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
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" />
              Secondary Information
            </h2>
            <AdminPartnerEditForm section="secondary" partner={editablePartner}>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <dt className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                  Agreement Sent?
                </dt>
                <dd className="text-white text-sm">{partner.contractStatus !== "not_sent" ? "Yes" : "No"}</dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                  Agreement Signed
                </dt>
                <dd className="text-white text-sm">{partner.contractSignedAt ? "Yes" : "No"}</dd>
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
                <dd className="text-white text-sm">{partner.dateOfBirth || "—"}</dd>
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
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-slate-400" />
              Financial Information
            </h2>
            <AdminPartnerEditForm section="financial" partner={editablePartner}>
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
                  Partner Address
                </dt>
                <dd className="text-white text-sm">{partner.partnerAddress || "—"}</dd>
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
                <dd className="text-white text-sm capitalize">{partner.paymentFrequency || "—"}</dd>
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
