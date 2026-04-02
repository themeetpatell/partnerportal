import { auth, currentUser } from "@repo/auth/server"
import { redirect } from "next/navigation"
import {
  db,
  derivePartnerOnboardingStage,
  derivePartnerOperationalStatus,
  formatPartnerOnboardingStage,
  formatPartnerOperationalStatus,
  leads,
  partners,
} from "@repo/db"
import { eq } from "drizzle-orm"
import {
  BadgeCheck,
  Banknote,
  Briefcase,
  Building2,
  Calendar,
  CreditCard,
  FileText,
  Globe,
  GraduationCap,
  Hash,
  Landmark,
  Link2,
  Mail,
  MapPin,
  Phone,
  Shield,
  ShieldCheck,
  User,
  Users,
} from "lucide-react"
import { ProfileEditForm } from "@/components/profile-edit-form"
import { ContractSigningForm } from "@/components/contract-signing-form"
import { getMissingAgreementFields } from "@/lib/signed-agreement"

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    approved: {
      label: "Approved",
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

function LifecyclePill({
  label,
  tone,
}: {
  label: string
  tone: "indigo" | "emerald" | "amber" | "slate"
}) {
  const tones = {
    indigo: "border-indigo-400/20 bg-indigo-500/12 text-indigo-200",
    emerald: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
    amber: "border-amber-400/20 bg-amber-400/10 text-amber-300",
    slate: "border-white/10 bg-white/5 text-slate-400",
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold capitalize ${tones[tone]}`}
    >
      {label}
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

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType
  title: string
  description?: string
}) {
  return (
    <div className="mb-6 flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/6 text-white">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h2 className="font-heading text-2xl font-semibold text-white">{title}</h2>
        {description && (
          <p className="mt-0.5 text-sm text-slate-400">{description}</p>
        )}
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
        .where(eq(partners.authUserId, userId))
        .limit(1)
        .then((rows) => rows[0] ?? null)
    : null

  if (!partnerRecord) {
    redirect("/onboarding")
  }

  const partnerLeads = partnerRecord
    ? await db
        .select({
          status: leads.status,
          createdAt: leads.createdAt,
        })
        .from(leads)
        .where(eq(leads.partnerId, partnerRecord.id))
    : []

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

  const operationalStatus = partnerRecord
    ? derivePartnerOperationalStatus(
        {
          contractStatus: partnerRecord.contractStatus,
          contractSignedAt: partnerRecord.contractSignedAt,
          onboardedAt: partnerRecord.onboardedAt,
        },
        partnerLeads
      )
    : null

  const onboardingStage = partnerRecord
    ? derivePartnerOnboardingStage(
        {
          meetingCompletedAt: partnerRecord.meetingCompletedAt,
          onboardedAt: partnerRecord.onboardedAt,
          nurturingStartedAt: partnerRecord.nurturingStartedAt,
        },
        partnerLeads
      )
    : null

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

  const onboardingBannerMessage =
    partnerRecord.onboardedAt
      ? "Your agreement has been accepted and onboarding is complete. Revenue features are now unlocked."
      : partnerRecord.contractStatus === "signed"
        ? "Agreement signed. Finanshels will review the signed contract and unlock your workspace after final acceptance."
      : partnerRecord.contractStatus === "sent"
        ? "Your agreement is ready in the portal. Review it and complete the signature to move the application forward."
        : partnerRecord.status === "approved"
          ? "Your partner account is approved. Finanshels still needs to send the agreement here before revenue features can unlock."
          : partnerRecord.status === "rejected"
            ? `Your application was rejected${partnerRecord.rejectionReason ? `: ${partnerRecord.rejectionReason}` : "."}`
            : partnerRecord.status === "suspended"
              ? `Your account is currently suspended${partnerRecord.suspensionReason ? `: ${partnerRecord.suspensionReason}` : "."}`
              : "Your application is under review. Finanshels will share the agreement here when the next onboarding step is ready."

  const operationalLabel = operationalStatus
    ? formatPartnerOperationalStatus(operationalStatus)
    : null
  const onboardingLabel = onboardingStage
    ? formatPartnerOnboardingStage(onboardingStage)
    : null
  const showOnboardingPill = Boolean(
    onboardingLabel &&
      onboardingLabel !== operationalLabel &&
      onboardingStage !== "activated"
  )

  const editablePartnerData = partnerRecord
    ? {
        companyName: partnerRecord.companyName,
        contactName: partnerRecord.contactName,
        phone: partnerRecord.phone,
        designation: partnerRecord.designation,
        dateOfBirth: partnerRecord.dateOfBirth,
        secondaryEmail: partnerRecord.secondaryEmail,
        website: partnerRecord.website,
        linkedinId: partnerRecord.linkedinId,
        nationality: partnerRecord.nationality,
        businessSize: partnerRecord.businessSize,
        partnerIndustry: partnerRecord.partnerIndustry,
        overview: partnerRecord.overview,
        partnerAddress: partnerRecord.partnerAddress,
        emailOptOut: partnerRecord.emailOptOut,
        vatRegistered: partnerRecord.vatRegistered,
        vatNumber: partnerRecord.vatNumber,
        tradeLicense: partnerRecord.tradeLicense,
        emirateIdPassport: partnerRecord.emirateIdPassport,
        beneficiaryName: partnerRecord.beneficiaryName,
        bankName: partnerRecord.bankName,
        bankCountry: partnerRecord.bankCountry,
        accountNoIban: partnerRecord.accountNoIban,
        swiftBicCode: partnerRecord.swiftBicCode,
        paymentFrequency: partnerRecord.paymentFrequency,
      }
    : null

  const agreementMissingFields = getMissingAgreementFields({
    type: partnerRecord.type as "referral" | "channel",
    companyName: partnerRecord.companyName,
    contactName: partnerRecord.contactName,
    email: partnerRecord.email,
    partnerAddress: partnerRecord.partnerAddress,
    emirateIdPassport: partnerRecord.emirateIdPassport,
    tradeLicense: partnerRecord.tradeLicense,
    beneficiaryName: partnerRecord.beneficiaryName,
    bankName: partnerRecord.bankName,
    bankCountry: partnerRecord.bankCountry,
    accountNoIban: partnerRecord.accountNoIban,
    swiftBicCode: partnerRecord.swiftBicCode,
    contractSentAt: partnerRecord.contractSentAt,
  })

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
                {user?.email || "No email available"}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="tag-pill">
                  <BadgeCheck className="h-4 w-4 text-white" />
                  Authenticated account
                </span>
                <StatusBadge status={partnerRecord.status} />
                {operationalStatus && (
                  <LifecyclePill
                    label={operationalLabel!}
                    tone={operationalTone}
                  />
                )}
                {showOnboardingPill && (
                  <LifecyclePill
                    label={onboardingLabel!}
                    tone={onboardingTone}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <FieldRow
              icon={Mail}
              label="Email"
              value={user?.email}
            />
            <FieldRow
              icon={Hash}
              label="Account ID"
              value={user?.id}
            />
          </div>
        </div>
      </section>

      <>
        <>
          <section className="surface-card rounded-[2rem] p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500">
                    Onboarding
                  </p>
                  <LifecyclePill
                    label={partnerRecord.contractStatus.replaceAll("_", " ")}
                    tone={
                      partnerRecord.contractStatus === "signed"
                        ? "emerald"
                        : partnerRecord.contractStatus === "sent"
                          ? "indigo"
                          : "amber"
                    }
                  />
                  {onboardingStage && (
                    <LifecyclePill
                      label={formatPartnerOnboardingStage(onboardingStage)}
                      tone={onboardingTone}
                    />
                  )}
                </div>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
                  {onboardingBannerMessage}
                </p>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-400">
                  <span>
                    Agreement:{" "}
                    {partnerRecord.agreementUrl ? (
                      <a
                        href={partnerRecord.agreementUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-300 hover:text-indigo-200"
                      >
                        View prefilled agreement
                      </a>
                    ) : (
                      "Not shared yet"
                    )}
                  </span>
                  <span>
                    Sent: {partnerRecord.contractSentAt ? formatDate(partnerRecord.contractSentAt) : "Pending"}
                  </span>
                  <span>
                    Signed: {partnerRecord.contractSignedAt ? formatDate(partnerRecord.contractSignedAt) : "Not signed"}
                  </span>
                  {partnerRecord.contractSignedAt ? (
                    <a
                      href="/api/profile/contract/download"
                      className="text-indigo-300 hover:text-indigo-200"
                    >
                      Download signed PDF
                    </a>
                  ) : null}
                </div>
                {partnerRecord.agreementUrl ? (
                  <p className="mt-3 text-sm text-slate-400">
                    The agreement link opens a prefilled PDF generated from your profile details.
                    Update your profile first if any company or bank particulars are incorrect.
                  </p>
                ) : null}
              </div>
            </div>

            {partnerRecord.contractStatus === "sent" &&
              !partnerRecord.contractSignedAt &&
              agreementMissingFields.length > 0 && (
                <div className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-4 text-sm text-amber-100">
                  <p className="font-medium text-amber-200">
                    Complete these profile details before you can sign the agreement:
                  </p>
                  <p className="mt-2 leading-6 text-amber-100/90">
                    {agreementMissingFields.map((field) => field.label).join(", ")}.
                  </p>
                  <p className="mt-2 text-amber-100/80">
                    Update the Secondary Information and Financial Information sections below,
                    then reopen the agreement preview and sign it here.
                  </p>
                </div>
              )}

            {partnerRecord.contractStatus === "sent" &&
              !partnerRecord.contractSignedAt &&
              agreementMissingFields.length === 0 && (
                <ContractSigningForm
                  contactName={partnerRecord.contactName}
                  designation={partnerRecord.designation}
                />
              )}
          </section>

          {/* Primary Information */}
          <section className="surface-card rounded-[2rem] p-6 sm:p-7">
            <div className="mb-6 flex items-center justify-between gap-4">
              <SectionHeader
                icon={Building2}
                title="Primary Information"
                description="Your commercial profile as registered with Finanshels."
              />
              <StatusBadge status={partnerRecord.status} />
            </div>

            <ProfileEditForm section="primary" partner={editablePartnerData!}>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <FieldRow
                  icon={Building2}
                  label="Partner organisation"
                  value={partnerRecord.companyName}
                />
                <FieldRow
                  icon={User}
                  label="Partner name"
                  value={partnerRecord.contactName}
                />
                <FieldRow
                  icon={ShieldCheck}
                  label="Partner type"
                  value={partnerTypeLabel}
                />
                <FieldRow
                  icon={Mail}
                  label="Email"
                  value={partnerRecord.email}
                />
                <FieldRow
                  icon={Phone}
                  label="Phone"
                  value={partnerRecord.phone}
                />
                <FieldRow
                  icon={Briefcase}
                  label="Designation"
                  value={partnerRecord.designation}
                />
                <FieldRow
                  icon={Calendar}
                  label="Date of birth"
                  value={partnerRecord.dateOfBirth}
                />
                <FieldRow
                  icon={Mail}
                  label="Secondary email"
                  value={partnerRecord.secondaryEmail}
                />
              </div>
            </ProfileEditForm>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <FieldRow
                icon={Users}
                label="Partner owner"
                value={partnerRecord.partnershipManager || "Partnership Team"}
              />
              <FieldRow
                icon={Users}
                label="Partnership manager"
                value={partnerRecord.partnershipManager}
              />
              <FieldRow
                icon={Users}
                label="Appointments setter"
                value={partnerRecord.appointmentsSetter}
              />
              <FieldRow
                icon={Hash}
                label="Partners ID"
                value={partnerRecord.partnersId}
              />
              <FieldRow
                icon={Shield}
                label="Partner stage"
                value={partnerRecord.strategicFunnelStage}
              />
              <FieldRow
                icon={Calendar}
                label="Last met on"
                value={formatDate(partnerRecord.lastMetOn)}
              />
              <FieldRow
                icon={Calendar}
                label="Meeting scheduled date (AS)"
                value={formatDate(partnerRecord.meetingScheduledDateAS)}
              />
              <FieldRow
                icon={Calendar}
                label="Meeting date (PM)"
                value={formatDate(partnerRecord.meetingDatePM)}
              />
              <FieldRow
                icon={Calendar}
                label="Onboarding date"
                value={formatDate(partnerRecord.onboardedAt)}
              />
              <FieldRow
                icon={Calendar}
                label="Activation date"
                value={formatDate(partnerRecord.activationDate)}
              />
              <FieldRow
                icon={Calendar}
                label="Registered on"
                value={formatDate(partnerRecord.createdAt)}
              />
            </div>
          </section>

          {/* Secondary Information */}
          <section className="surface-card rounded-[2rem] p-6 sm:p-7">
            <SectionHeader
              icon={FileText}
              title="Secondary Information"
              description="Agreement details, profile, and additional information."
            />

            {/* Admin-managed fields (read-only for partner) */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mb-4">
              <FieldRow
                icon={FileText}
                label="Agreement sent?"
                value={partnerRecord.contractStatus !== "not_sent" ? "Yes" : "No"}
              />
              <FieldRow
                icon={FileText}
                label="Agreement signed"
                value={partnerRecord.contractSignedAt ? "Yes" : "No"}
              />
              <FieldRow
                icon={FileText}
                label="Agreement"
                value={partnerRecord.agreementUrl ? "View agreement" : null}
              />
              <FieldRow
                icon={Shield}
                label="Partnership level"
                value={partnerRecord.partnershipLevel || partnerRecord.tier}
              />
              <FieldRow
                icon={Calendar}
                label="Agreement start date"
                value={formatDate(partnerRecord.agreementStartDate)}
              />
              <FieldRow
                icon={Calendar}
                label="Agreement end date"
                value={formatDate(partnerRecord.agreementEndDate)}
              />
              <FieldRow
                icon={GraduationCap}
                label="Sales training done"
                value={partnerRecord.salesTrainingDone ? "Yes" : "No"}
              />
            </div>

            {/* Partner-editable fields */}
            <ProfileEditForm section="secondary" partner={editablePartnerData!}>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <FieldRow
                  icon={Link2}
                  label="LinkedIn ID"
                  value={partnerRecord.linkedinId}
                />
                <FieldRow
                  icon={Globe}
                  label="Partner website"
                  value={partnerRecord.website}
                />
                <FieldRow
                  icon={Globe}
                  label="Nationality"
                  value={partnerRecord.nationality}
                />
                <FieldRow
                  icon={Users}
                  label="Business size"
                  value={partnerRecord.businessSize}
                />
                <FieldRow
                  icon={Briefcase}
                  label="Partner industry"
                  value={partnerRecord.partnerIndustry}
                />
                <FieldRow
                  icon={MapPin}
                  label="Address"
                  value={partnerRecord.partnerAddress}
                />
                <FieldRow
                  icon={Mail}
                  label="Secondary email"
                  value={partnerRecord.secondaryEmail}
                />
                <FieldRow
                  icon={Mail}
                  label="Email opt out"
                  value={partnerRecord.emailOptOut ? "Yes" : "No"}
                />
                {partnerRecord.overview && (
                  <div className="sm:col-span-2 lg:col-span-3">
                    <FieldRow
                      icon={FileText}
                      label="Overview"
                      value={partnerRecord.overview}
                    />
                  </div>
                )}
              </div>
            </ProfileEditForm>
          </section>

          {/* Financial Information */}
          <section className="surface-card rounded-[2rem] p-6 sm:p-7">
            <SectionHeader
              icon={CreditCard}
              title="Financial Information"
              description="Commission, tax, and banking details."
            />

            {/* Admin-managed fields (read-only for partner) */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mb-4">
              <FieldRow
                icon={CreditCard}
                label="Commission type"
                value={partnerRecord.commissionType}
              />
              <FieldRow
                icon={CreditCard}
                label="Commission rate"
                value={partnerRecord.commissionRate ? `${partnerRecord.commissionRate}%` : null}
              />
            </div>

            {/* Partner-editable fields */}
            <ProfileEditForm section="financial" partner={editablePartnerData!}>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <FieldRow
                  icon={FileText}
                  label="VAT registered"
                  value={partnerRecord.vatRegistered ? "Yes" : "No"}
                />
                <FieldRow
                  icon={Hash}
                  label="VAT number"
                  value={partnerRecord.vatNumber}
                />
                <FieldRow
                  icon={MapPin}
                  label="Partner address"
                  value={partnerRecord.partnerAddress}
                />
                <FieldRow
                  icon={FileText}
                  label="Trade license"
                  value={partnerRecord.tradeLicense}
                />
                <FieldRow
                  icon={User}
                  label="Beneficiary name (as per bank)"
                  value={partnerRecord.beneficiaryName}
                />
                <FieldRow
                  icon={Landmark}
                  label="Bank name"
                  value={partnerRecord.bankName}
                />
                <FieldRow
                  icon={Globe}
                  label="Bank country"
                  value={partnerRecord.bankCountry}
                />
                <FieldRow
                  icon={Hash}
                  label="Account No / IBAN"
                  value={partnerRecord.accountNoIban}
                />
                <FieldRow
                  icon={Hash}
                  label="SWIFT / BIC code"
                  value={partnerRecord.swiftBicCode}
                />
                <FieldRow
                  icon={Banknote}
                  label="Payment frequency"
                  value={partnerRecord.paymentFrequency}
                />
                <FieldRow
                  icon={Hash}
                  label="Emirate ID / Passport"
                  value={partnerRecord.emirateIdPassport}
                />
              </div>
            </ProfileEditForm>
          </section>

          {/* Rejection reason */}
          {partnerRecord.rejectionReason && (
            <section className="surface-card rounded-[2rem] p-6 sm:p-7">
              <div className="rounded-[1.4rem] border border-rose-400/20 bg-rose-400/10 px-5 py-4">
                <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-rose-400">
                  Rejection reason
                </p>
                <p className="mt-1 text-sm text-rose-200">
                  {partnerRecord.rejectionReason}
                </p>
              </div>
            </section>
          )}

          {partnerRecord.zohoContactId && (
            <section className="surface-card rounded-[2rem] p-6 sm:p-7">
              <FieldRow
                icon={Hash}
                label="CRM contact ID"
                value={partnerRecord.zohoContactId}
              />
            </section>
          )}
        </>
      </>
    </div>
  )
}
