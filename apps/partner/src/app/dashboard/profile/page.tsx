import { auth, currentUser } from "@repo/auth/server"
import Image from "next/image"
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
  CheckCircle2,
  Clock,
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
                {operationalStatus && (
                  <LifecyclePill
                    label={formatPartnerOperationalStatus(operationalStatus)}
                    tone={operationalTone}
                  />
                )}
                {onboardingStage && (
                  <LifecyclePill
                    label={formatPartnerOnboardingStage(onboardingStage)}
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
        <>
          <section className="surface-card rounded-[2rem] p-6 sm:p-7">
            <SectionHeader
              icon={CheckCircle2}
              title="Partner Onboarding"
              description="Contract, onboarding, and activation are tracked here."
            />

            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
                <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500">
                  Contract status
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
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
                </div>

                <div className="mt-4 space-y-2 text-sm text-slate-300">
                  <p>
                    Contract delivery:
                    {" "}
                    {partnerRecord.contractSentAt ? (
                      <span className="text-white">
                        Sent on {formatDate(partnerRecord.contractSentAt)}
                      </span>
                    ) : (
                      <span className="text-slate-500">Waiting for Finanshels to send it</span>
                    )}
                  </p>
                  <p>
                    Agreement:
                    {" "}
                    {partnerRecord.agreementUrl ? (
                      <a
                        href={partnerRecord.agreementUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-300 hover:text-indigo-200"
                      >
                        Download agreement
                      </a>
                    ) : (
                      <span className="text-slate-500">Not available yet</span>
                    )}
                  </p>
                  <p>
                    Signed on:
                    {" "}
                    <span className="text-white">
                      {formatDate(partnerRecord.contractSignedAt) ?? "Not signed yet"}
                    </span>
                  </p>
                  <p>
                    Signed by:
                    {" "}
                    <span className="text-white">
                      {partnerRecord.contractSignedName ?? "Pending signature"}
                    </span>
                  </p>
                  <p>
                    Signature method:
                    {" "}
                    <span className="text-white capitalize">
                      {partnerRecord.contractSignatureType ?? "Not captured"}
                    </span>
                  </p>
                  {partnerRecord.contractSignedAt && (
                    <p>
                      Signed PDF:
                      {" "}
                      <a
                        href="/api/profile/contract/download"
                        className="text-indigo-300 hover:text-indigo-200"
                      >
                        Download signed PDF
                      </a>
                    </p>
                  )}
                </div>

                {partnerRecord.contractStatus === "sent" && !partnerRecord.contractSignedAt && (
                  <form
                    action="/api/profile/contract"
                    method="POST"
                    encType="multipart/form-data"
                    className="mt-5 space-y-3"
                  >
                    <input
                      type="text"
                      name="signedName"
                      defaultValue={partnerRecord.contactName}
                      placeholder="Full legal name"
                      required
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-slate-500"
                    />
                    <input
                      type="text"
                      name="signedDesignation"
                      defaultValue={partnerRecord.designation ?? ""}
                      placeholder="Designation"
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-slate-500"
                    />
                    <select
                      name="signatureType"
                      defaultValue="typed"
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white"
                    >
                      <option value="typed">Digital signature by typed name</option>
                      <option value="upload">Upload signature image</option>
                    </select>
                    <input
                      type="file"
                      name="signatureFile"
                      accept="image/png,image/jpeg,image/webp"
                      className="block w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-500/15 file:px-3 file:py-2 file:text-indigo-200"
                    />
                    <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
                      <input
                        type="checkbox"
                        name="confirm"
                        value="yes"
                        required
                        className="mt-1 h-4 w-4 rounded border-white/20 bg-white/5"
                      />
                      <span>
                        I confirm that I have reviewed the agreement and I am signing on behalf
                        of this partner account.
                      </span>
                    </label>
                    <button type="submit" className="primary-button w-full justify-center">
                      Sign agreement
                    </button>
                  </form>
                )}

                {partnerRecord.contractSignatureType === "upload" &&
                  partnerRecord.contractSignatureDataUrl && (
                    <div className="mt-5 rounded-[1.2rem] border border-white/8 bg-white/[0.03] p-4">
                      <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500">
                        Uploaded signature
                      </p>
                      <Image
                        src={partnerRecord.contractSignatureDataUrl}
                        alt="Uploaded signature"
                        width={160}
                        height={80}
                        unoptimized
                        className="mt-3 max-h-24 rounded-lg bg-white p-2"
                      />
                    </div>
                  )}
              </div>

              <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
                <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500">
                  What happens next
                </p>
                <div className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
                  <p>1. Finanshels shares the agreement inside the partner portal.</p>
                  <p>2. You download and review the agreement document.</p>
                  <p>3. You complete the in-portal signature using typed consent or an uploaded signature image.</p>
                  <p>4. The partnership team completes onboarding and your first qualified lead activates the account.</p>
                </div>
              </div>
            </div>
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
