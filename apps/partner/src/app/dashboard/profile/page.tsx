import { currentUser } from "@repo/auth/server"
import Link from "next/link"
import { redirect } from "next/navigation"
import {
  db,
  derivePartnerOperationalStatus,
  formatPartnerOperationalStatus,
  leads,
} from "@repo/db"
import { eq } from "drizzle-orm"
import {
  ArrowUpRight,
  Briefcase,
  Building2,
  Calendar,
  CreditCard,
  FileText,
  Globe,
  Hash,
  Landmark,
  Link2,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  User,
  Download,
  Eye,
} from "lucide-react"
import { ProfileEditForm } from "@/components/profile-edit-form"
import { AvatarUploadWrapper } from "@/components/avatar-upload-wrapper"
import { getCurrentPartnerRecord } from "@/lib/partner-record"

function LifecyclePill({
  label,
  tone,
}: {
  label: string
  tone: "indigo" | "emerald" | "amber" | "slate"
}) {
  const tones = {
    indigo: "border-primary/20 bg-primary/12 text-primary",
    emerald: "border-emerald-400/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    amber: "border-amber-400/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    slate: "border-border bg-secondary/50 text-muted-foreground",
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
  href,
}: {
  icon: React.ElementType
  label: string
  value: string | null | undefined
  href?: string | null
}) {
  const hasValue = Boolean(value)
  return (
    <div className="border-b border-border py-4 last:border-b-0">
      <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span>{label}</span>
      </div>
      {href && hasValue ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-foreground transition-colors hover:text-primary"
        >
          <span className="break-all">{value}</span>
          <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
        </a>
      ) : (
        <p className="mt-2 text-sm font-medium leading-6 text-foreground break-words">
          {value || <span className="text-muted-foreground/60">—</span>}
        </p>
      )}
    </div>
  )
}

function SectionHeader({
  title,
  description,
}: {
  title: string
  description?: string
}) {
  return (
    <div className="mb-5">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {description && (
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent: string
}) {
  return (
    <div className="min-w-[120px] border-l border-border pl-6 first:border-l-0 first:pl-0">
      <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </p>
      <p className={`mt-1.5 text-lg font-semibold ${accent}`}>{value}</p>
    </div>
  )
}

function normalizeUrl(value: string | null | undefined) {
  if (!value) return null
  if (/^https?:\/\//i.test(value)) return value
  return `https://${value}`
}

function normalizeLinkedInUrl(value: string | null | undefined) {
  if (!value) return null
  if (/^https?:\/\//i.test(value)) return value
  if (value.includes("linkedin.com/")) return `https://${value}`
  return `https://www.linkedin.com/in/${value.replace(/^@/, "")}`
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ contract?: string; reason?: string }>
}) {
  const { contract: contractQuery, reason: contractReason } = await searchParams
  const [user, partnerRecord] = await Promise.all([
    currentUser(),
    getCurrentPartnerRecord(),
  ])

  const fullName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Partner"

  if (!partnerRecord) {
    redirect("/onboarding")
  }

  const partnerLeads = await db
    .select({
      status: leads.status,
      createdAt: leads.createdAt,
    })
    .from(leads)
    .where(eq(leads.partnerId, partnerRecord.id))

  const partnerTypeLabel =
    partnerRecord.type === "channel" ? "Channel Partner" : "Referral Partner"

  const formatDate = (d: Date | null | undefined) =>
    d
      ? new Date(d).toLocaleDateString("en-AE", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : null

  const operationalStatus = derivePartnerOperationalStatus(
    {
      status: partnerRecord.status,
      contractStatus: partnerRecord.contractStatus,
      contractSignedAt: partnerRecord.contractSignedAt,
      onboardedAt: partnerRecord.onboardedAt,
    },
    partnerLeads
  )

  const operationalTone =
    operationalStatus === "active_partner"
      ? "emerald"
      : operationalStatus === "inactive_partner"
        ? "slate"
        : "amber"

  const onboardingBannerMessage =
    partnerRecord.onboardedAt
      ? "Your partner agreement has been signed and the workspace is unlocked."
      : partnerRecord.status === "approved"
            ? "Your partner account is approved. Workspace access is active."
            : partnerRecord.status === "rejected"
              ? `Your application was rejected${partnerRecord.rejectionReason ? `: ${partnerRecord.rejectionReason}` : "."}`
              : partnerRecord.status === "suspended"
                ? `Your account is currently suspended${partnerRecord.suspensionReason ? `: ${partnerRecord.suspensionReason}` : "."}`
                : "Your application is under review. The partner agreement you completed during signup is already on file."

  const operationalLabelMap: Record<string, string> = {
    active_partner: "Active",
    inactive_partner: "Inactive",
    yet_to_onboard: "Yet to onboard",
    yet_to_activate: "Yet to activate",
  }
  const operationalLabel =
    operationalLabelMap[operationalStatus] ?? formatPartnerOperationalStatus(operationalStatus)
  const agreementStatusLabel = partnerRecord.onboardedAt
    ? "Onboarding complete"
    : partnerRecord.status === "approved"
      ? "Approved"
      : "Under review"
  const contractFlashMessage =
    contractQuery === "signed" || contractQuery === "ready"
      ? "Your partner agreement has been signed and is now in effect. Two-party signatures are captured during the onboarding process."
      : contractQuery === "declined"
        ? "The separate contract signing has been removed from the onboarding flow."
        : contractQuery === "later"
          ? "The separate contract signing has been removed from the onboarding flow."
        : contractQuery === "missing-fields"
            ? contractReason || "Your partner agreement has been signed. Update profile details when needed."
            : contractQuery === "unavailable"
              ? contractReason || "The agreement flow has been integrated into the onboarding process with no separate signature step required."
              : null
  const contractFlashTone =
    contractQuery === "signed"
      ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-100"
      : contractQuery === "declined" || contractQuery === "missing-fields" || contractQuery === "unavailable"
        ? "border-amber-400/20 bg-amber-500/10 text-amber-700 dark:text-amber-100"
        : contractQuery === "later" || contractQuery === "ready"
          ? "border-primary/20 bg-primary/10 text-primary"
          : ""

  const editablePartnerData = {
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

  const websiteHref = normalizeUrl(partnerRecord.website)
  const linkedInHref = normalizeLinkedInUrl(partnerRecord.linkedinId)
  const memberSince = formatDate(partnerRecord.createdAt) || "—"
  const profileCompletenessFields = [
    partnerRecord.companyName,
    partnerRecord.contactName,
    partnerRecord.phone,
    partnerRecord.designation,
    partnerRecord.secondaryEmail,
    partnerRecord.website,
    partnerRecord.linkedinId,
    partnerRecord.nationality,
    partnerRecord.businessSize,
    partnerRecord.partnerIndustry,
    partnerRecord.overview,
    partnerRecord.partnerAddress,
    partnerRecord.tradeLicense,
    partnerRecord.beneficiaryName,
    partnerRecord.bankName,
    partnerRecord.bankCountry,
    partnerRecord.accountNoIban,
    partnerRecord.swiftBicCode,
  ]
  const profileStrength = Math.round(
    (profileCompletenessFields.filter((value) => Boolean(value)).length /
      profileCompletenessFields.length) *
      100
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-title">Profile</h1>
      </div>

      <section className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-[0_30px_80px_rgba(15,23,42,0.45)]">
        <div className="px-5 pt-6 pb-6 sm:px-8 sm:pt-8 sm:pb-8">
          {/* Row 1: Avatar + Identity */}
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <AvatarUploadWrapper profileImageUrl={partnerRecord.profileImageUrl} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  {fullName}
                </h2>
                <LifecyclePill
                  label={operationalLabel}
                  tone={operationalTone}
                />
              </div>
              <p className="mt-1.5 text-sm text-[var(--portal-text-soft)]">
                {[partnerRecord.designation, partnerRecord.companyName].filter(Boolean).join(" at ") ||
                  partnerTypeLabel}
              </p>
            </div>
          </div>

          {/* Row 2: Stats strip */}
          <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-4 border-t border-border pt-5">
            <StatCard
              label="Profile strength"
              value={`${profileStrength}%`}
              accent="text-foreground"
            />
            <StatCard
              label="Member since"
              value={memberSince}
              accent="text-sky-700 dark:text-sky-300"
            />
            <StatCard
              label="Partner type"
              value={partnerTypeLabel}
              accent="text-primary"
            />
          </div>

          {/* Activation hint */}
          {operationalStatus === "yet_to_activate" && (
            <div className="mt-5 flex items-center gap-3 rounded-xl border border-amber-400/20 bg-amber-50 px-4 py-3 dark:bg-amber-400/5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-400/10">
                <ArrowUpRight className="h-4 w-4 text-amber-700 dark:text-amber-300" />
              </div>
              <p className="text-sm leading-snug text-amber-800 dark:text-amber-200/80">
                Your partnership will be activated once you refer your first lead to Finanshels.
              </p>
            </div>
          )}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.75fr)_420px]">
        <div className="space-y-6">
          <section className="surface-card rounded-[2rem] p-6 sm:p-7">
            <SectionHeader title="Partner Agreement" />

            <div className="grid gap-x-8 md:grid-cols-2 xl:grid-cols-3">
              <FieldRow
                icon={ShieldCheck}
                label="Partner type"
                value={partnerTypeLabel}
              />
              <FieldRow
                icon={Calendar}
                label="Activation date"
                value={formatDate(partnerRecord.activationDate)}
              />
            </div>

            <div className="mt-5 rounded-[1.5rem] border border-border bg-secondary/50 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <LifecyclePill
                  label={agreementStatusLabel}
                  tone={partnerRecord.status === "approved" ? "emerald" : "amber"}
                />
              </div>

              <p className="mt-4 max-w-3xl text-sm leading-6 text-[var(--portal-text-soft)]">
                {onboardingBannerMessage}
              </p>

              {contractFlashMessage ? (
                <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm leading-6 ${contractFlashTone}`}>
                  {contractFlashMessage}
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                <span>
                  Signed: {formatDate(partnerRecord.contractSignedAt ?? partnerRecord.createdAt) || "—"}
                </span>
                <span>
                  Approved: {formatDate(partnerRecord.activationDate) || "Pending"}
                </span>
                <span>
                  Workspace: {partnerRecord.status === "approved" ? "Active" : "Pending review"}
                </span>
              </div>

              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                Your partner agreement is digitally signed during onboarding with a two-party signature (Finanshels Accounting Technologies + your authorized signatory). This is the sole required legal document for partnership activation.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/api/profile/contract/download?disposition=inline"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-primary/30 hover:text-primary"
                >
                  <Eye className="h-4 w-4" />
                  View agreement
                </Link>
                <Link
                  href="/api/profile/contract/download"
                  className="inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-4 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/15"
                >
                  <Download className="h-4 w-4" />
                  Download PDF
                </Link>
              </div>
            </div>
          </section>

          <section className="surface-card rounded-[2rem] p-6 sm:p-7">
            <ProfileEditForm
              section="contact"
              title="Contact and Reach"
              partner={editablePartnerData}
            >
              <div className="grid gap-x-8 md:grid-cols-2 xl:grid-cols-3">
                <FieldRow
                  icon={User}
                  label="Primary contact"
                  value={partnerRecord.contactName}
                />
                <FieldRow
                  icon={Briefcase}
                  label="Designation"
                  value={partnerRecord.designation}
                />
                <FieldRow
                  icon={Mail}
                  label="Primary email"
                  value={partnerRecord.email}
                  href={partnerRecord.email ? `mailto:${partnerRecord.email}` : null}
                />
                <FieldRow
                  icon={Phone}
                  label="Phone / mobile number"
                  value={partnerRecord.phone}
                  href={partnerRecord.phone ? `tel:${partnerRecord.phone}` : null}
                />
                <FieldRow
                  icon={Mail}
                  label="Secondary email"
                  value={partnerRecord.secondaryEmail}
                  href={partnerRecord.secondaryEmail ? `mailto:${partnerRecord.secondaryEmail}` : null}
                />
                <FieldRow
                  icon={Calendar}
                  label="Date of birth"
                  value={partnerRecord.dateOfBirth}
                />
                <FieldRow
                  icon={Globe}
                  label="Website"
                  value={partnerRecord.website}
                  href={websiteHref}
                />
                <FieldRow
                  icon={Link2}
                  label="LinkedIn"
                  value={partnerRecord.linkedinId}
                  href={linkedInHref}
                />
                <FieldRow
                  icon={Globe}
                  label="Nationality"
                  value={partnerRecord.nationality}
                />
                <FieldRow
                  icon={MapPin}
                  label="Registered address"
                  value={partnerRecord.partnerAddress}
                />
              </div>
            </ProfileEditForm>
          </section>

          <section className="surface-card rounded-[2rem] p-6 sm:p-7">
            <ProfileEditForm
              section="financial"
              title="Financial Details"
              partner={editablePartnerData}
            >
              <div className="mb-4 grid gap-x-8 md:grid-cols-2 xl:grid-cols-3">
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

              <div className="grid gap-x-8 md:grid-cols-2 xl:grid-cols-3">
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
                  icon={FileText}
                  label="Trade license"
                  value={partnerRecord.tradeLicense}
                />
                <FieldRow
                  icon={User}
                  label="Beneficiary name"
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
                  label="Account / IBAN"
                  value={partnerRecord.accountNoIban}
                />
                <FieldRow
                  icon={Hash}
                  label="SWIFT / BIC"
                  value={partnerRecord.swiftBicCode}
                />
                <FieldRow
                  icon={Hash}
                  label="Emirates ID / Passport"
                  value={partnerRecord.emirateIdPassport}
                />
              </div>
            </ProfileEditForm>
          </section>

          {partnerRecord.rejectionReason && (
            <section className="surface-card rounded-[2rem] p-6 sm:p-7">
              <div className="rounded-[1.4rem] border border-rose-400/20 bg-rose-50 px-5 py-4 dark:bg-rose-400/10">
                <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-rose-700 dark:text-rose-400">
                  Rejection reason
                </p>
                <p className="mt-2 text-sm leading-6 text-rose-800 dark:text-rose-200">
                  {partnerRecord.rejectionReason}
                </p>
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <section className="surface-card rounded-[2rem] p-6 sm:p-7">
            <ProfileEditForm
              section="company"
              title="Company Info"
              partner={editablePartnerData}
            >
              <div className="grid gap-x-8 md:grid-cols-2 xl:grid-cols-1">
                <FieldRow
                  icon={Building2}
                  label="Company"
                  value={partnerRecord.companyName}
                />
                <FieldRow
                  icon={Briefcase}
                  label="Industry"
                  value={partnerRecord.partnerIndustry}
                />
                <FieldRow
                  icon={Hash}
                  label="Business size"
                  value={partnerRecord.businessSize}
                />
                <FieldRow
                  icon={Mail}
                  label="Email opt out"
                  value={partnerRecord.emailOptOut ? "Yes" : "No"}
                />
                <div className="border-b border-border py-4">
                  <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                    Overview
                  </p>
                  <p className="mt-3 text-sm leading-7 text-foreground/90">
                    {partnerRecord.overview?.trim() || "Add a short company overview to make your profile feel complete and credible."}
                  </p>
                </div>
              </div>
            </ProfileEditForm>
          </section>

          <section className="surface-card rounded-[2rem] p-6">
            <SectionHeader title="Quick Snapshot" />
            <div className="grid gap-x-8 md:grid-cols-2 xl:grid-cols-1">
              <FieldRow
                icon={User}
                label="Profile strength"
                value={`${profileStrength}%`}
              />
              <FieldRow
                icon={Calendar}
                label="Onboarded on"
                value={formatDate(partnerRecord.onboardedAt)}
              />
            </div>
          </section>

          {partnerRecord.zohoContactId && (
            <section className="surface-card rounded-[2rem] p-6">
              <SectionHeader title="CRM Reference" />
              <FieldRow
                icon={Hash}
                label="CRM contact ID"
                value={partnerRecord.zohoContactId}
              />
            </section>
          )}
        </aside>
      </div>
    </div>
  )
}
