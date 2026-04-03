import sgMail from "@sendgrid/mail"

const apiKey = process.env.SENDGRID_API_KEY?.trim()
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL?.trim() || "noreply@finanshels.com"

let hasWarnedAboutMissingConfig = false

if (apiKey) {
  sgMail.setApiKey(apiKey)
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

async function sendEmail(message: {
  to: string
  subject: string
  html: string
}): Promise<void> {
  if (!apiKey) {
    if (!hasWarnedAboutMissingConfig) {
      hasWarnedAboutMissingConfig = true
      console.warn(
        "[notifications] SENDGRID_API_KEY is missing. Email sending is disabled until it is configured."
      )
    }
    return
  }

  await sgMail.send({
    to: message.to,
    from: FROM_EMAIL,
    subject: message.subject,
    html: message.html,
  })
}

function getPartnerPortalUrl() {
  return process.env.NEXT_PUBLIC_PARTNER_APP_URL?.trim() || "http://localhost:3000"
}

function buildPartnerEmailShell({
  eyebrow,
  title,
  body,
  ctaLabel,
  ctaHref,
}: {
  eyebrow: string
  title: string
  body: string
  ctaLabel?: string
  ctaHref?: string
}) {
  const ctaMarkup =
    ctaLabel && ctaHref
      ? `
        <div style="margin-top: 28px;">
          <a
            href="${ctaHref}"
            style="display:inline-block;padding:12px 20px;border-radius:9999px;background:#6366f1;color:#ffffff;text-decoration:none;font-weight:600;"
          >
            ${ctaLabel}
          </a>
        </div>
      `
      : ""

  return `
    <div style="margin:0;padding:32px 16px;background:#0b0b12;">
      <div style="max-width:600px;margin:0 auto;border:1px solid rgba(255,255,255,0.08);border-radius:28px;background:#141419;padding:40px 32px;font-family:Inter,Arial,sans-serif;color:#e5e7eb;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:28px;">
          <div style="width:40px;height:40px;border-radius:14px;background:linear-gradient(135deg,#818cf8 0%,#4f46e5 100%);color:#ffffff;font-weight:800;font-size:18px;display:flex;align-items:center;justify-content:center;">F</div>
          <div>
            <div style="font-size:15px;font-weight:700;color:#ffffff;">Finanshels</div>
            <div style="font-size:10px;letter-spacing:0.28em;text-transform:uppercase;color:#7c83a1;">Partner Portal</div>
          </div>
        </div>
        <div style="font-size:11px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:#9ca3ff;">${eyebrow}</div>
        <h1 style="margin:16px 0 0;font-size:32px;line-height:1.1;font-weight:800;color:#ffffff;">${title}</h1>
        <div style="margin-top:18px;font-size:15px;line-height:1.8;color:#cbd5e1;">${body}</div>
        ${ctaMarkup}
        <div style="margin-top:36px;padding-top:24px;border-top:1px solid rgba(255,255,255,0.06);font-size:12px;color:#6b7280;">
          You're receiving this because you're a Finanshels partner. Questions? Reply to this email.
        </div>
      </div>
    </div>
  `
}

const LEAD_STATUS_LABELS: Record<string, { label: string; description: string }> = {
  submitted: {
    label: "Received",
    description: "Your lead has been received and is being reviewed by the Finanshels team.",
  },
  qualified: {
    label: "Qualified",
    description: "Great news — this lead has been qualified. Our sales team is actively working it.",
  },
  proposal_sent: {
    label: "Proposal Sent",
    description: "A proposal has been sent to your client. We're waiting on their decision.",
  },
  deal_won: {
    label: "Deal Won",
    description: "This lead converted into a client. Your commission will be calculated shortly.",
  },
  deal_lost: {
    label: "Deal Lost",
    description: "Unfortunately this lead didn't convert. Keep submitting — every referral counts.",
  },
}

// ─── Partner lifecycle ────────────────────────────────────────────────────────

export async function sendPartnerApprovedEmail(
  to: string,
  partnerName: string,
  companyName: string
): Promise<void> {
  try {
    const safePartnerName = escapeHtml(partnerName)
    const safeCompanyName = escapeHtml(companyName)
    const portalUrl = escapeHtml(`${getPartnerPortalUrl()}/sign-in`)

    await sendEmail({
      to,
      subject: "Your partner application has been approved",
      html: buildPartnerEmailShell({
        eyebrow: "Partner approved",
        title: "Your application has been approved.",
        body: `
          <p>Hi ${safePartnerName},</p>
          <p>Your partner application for <strong>${safeCompanyName}</strong> has been approved by the Finanshels team.</p>
          <p>Your workspace will unlock after the agreement is sent, signed, and accepted. Sign in to track the next onboarding step.</p>
        `,
        ctaLabel: "Open partner portal",
        ctaHref: portalUrl,
      }),
    })
  } catch (error) {
    console.error("[notifications] sendPartnerApprovedEmail failed", {
      to,
      partnerName,
      companyName,
      error: String(error),
    })
  }
}

export async function sendPartnerContractReadyEmail(
  to: string,
  partnerName: string,
  companyName: string
): Promise<void> {
  try {
    const safePartnerName = escapeHtml(partnerName)
    const safeCompanyName = escapeHtml(companyName)
    const profileUrl = escapeHtml(`${getPartnerPortalUrl()}/dashboard/profile`)

    await sendEmail({
      to,
      subject: "Your partner agreement is ready for signature",
      html: buildPartnerEmailShell({
        eyebrow: "Agreement ready",
        title: "Review and sign your agreement.",
        body: `
          <p>Hi ${safePartnerName},</p>
          <p>Your partner agreement for <strong>${safeCompanyName}</strong> is now ready.</p>
          <p>Open your profile to review the prefilled agreement and complete the legally binding signature flow through Zoho Sign.</p>
        `,
        ctaLabel: "Open agreement",
        ctaHref: profileUrl,
      }),
    })
  } catch (error) {
    console.error("[notifications] sendPartnerContractReadyEmail failed", {
      to,
      partnerName,
      companyName,
      error: String(error),
    })
  }
}

export async function sendPartnerWorkspaceUnlockedEmail(
  to: string,
  partnerName: string,
  companyName: string
): Promise<void> {
  try {
    const safePartnerName = escapeHtml(partnerName)
    const safeCompanyName = escapeHtml(companyName)
    const portalUrl = escapeHtml(`${getPartnerPortalUrl()}/dashboard`)

    await sendEmail({
      to,
      subject: "Your partner workspace is now unlocked",
      html: buildPartnerEmailShell({
        eyebrow: "Workspace unlocked",
        title: "You can now use the full partner workspace.",
        body: `
          <p>Hi ${safePartnerName},</p>
          <p>Your signed agreement for <strong>${safeCompanyName}</strong> has been accepted by the Finanshels team.</p>
          <p>You can now submit leads, create service requests, manage your client book, and track commissions from the workspace.</p>
        `,
        ctaLabel: "Open workspace",
        ctaHref: portalUrl,
      }),
    })
  } catch (error) {
    console.error("[notifications] sendPartnerWorkspaceUnlockedEmail failed", {
      to,
      partnerName,
      companyName,
      error: String(error),
    })
  }
}

export async function sendPartnerReactivatedEmail(
  to: string,
  partnerName: string,
  companyName: string
): Promise<void> {
  try {
    const safePartnerName = escapeHtml(partnerName)
    const safeCompanyName = escapeHtml(companyName)
    const portalUrl = escapeHtml(`${getPartnerPortalUrl()}/sign-in`)

    await sendEmail({
      to,
      subject: "Your Finanshels partner access has been restored",
      html: buildPartnerEmailShell({
        eyebrow: "Access restored",
        title: "Your partner access has been reactivated.",
        body: `
          <p>Hi ${safePartnerName},</p>
          <p>Your partner access for <strong>${safeCompanyName}</strong> has been restored.</p>
          <p>You can sign back in and continue using the Finanshels Partner Portal.</p>
        `,
        ctaLabel: "Sign in to portal",
        ctaHref: portalUrl,
      }),
    })
  } catch (error) {
    console.error("[notifications] sendPartnerReactivatedEmail failed", {
      to,
      partnerName,
      companyName,
      error: String(error),
    })
  }
}

export async function sendPartnerSuspendedEmail(
  to: string,
  partnerName: string,
  reason?: string | null
): Promise<void> {
  try {
    const safePartnerName = escapeHtml(partnerName)
    const safeReason = reason ? escapeHtml(reason) : null
    const reasonMarkup = safeReason
      ? `<p><strong>Reason:</strong> ${safeReason}</p>`
      : `<p>If you need clarification, reply to this email and our team will help.</p>`

    await sendEmail({
      to,
      subject: "Your Finanshels partner access has been paused",
      html: buildPartnerEmailShell({
        eyebrow: "Access paused",
        title: "Your partner workspace has been suspended.",
        body: `
          <p>Hi ${safePartnerName},</p>
          <p>Your access to the Finanshels Partner Portal has been temporarily paused.</p>
          ${reasonMarkup}
        `,
      }),
    })
  } catch (error) {
    console.error("[notifications] sendPartnerSuspendedEmail failed", {
      to,
      partnerName,
      reason,
      error: String(error),
    })
  }
}

export async function sendPartnerApplicationReceivedEmail(
  to: string,
  partnerName: string,
  companyName: string,
  type: "referral" | "channel"
): Promise<void> {
  try {
    const safePartnerName = escapeHtml(partnerName)
    const safeCompanyName = escapeHtml(companyName)
    const partnerTypeLabel = type === "channel" ? "channel partner" : "referral partner"

    await sendEmail({
      to,
      subject: "We received your partner application",
      html: buildPartnerEmailShell({
        eyebrow: "Application received",
        title: "Your partner application is in review.",
        body: `
          <p>Hi ${safePartnerName},</p>
          <p>We received your ${partnerTypeLabel} application for <strong>${safeCompanyName}</strong>.</p>
          <p>Our team will review it and email you as soon as the approval decision is made.</p>
        `,
      }),
    })
  } catch (error) {
    console.error("[notifications] sendPartnerApplicationReceivedEmail failed", {
      to,
      partnerName,
      companyName,
      type,
      error: String(error),
    })
  }
}

export async function sendPartnerRejectedEmail(
  to: string,
  partnerName: string,
  reason?: string | null
): Promise<void> {
  try {
    const safePartnerName = escapeHtml(partnerName)
    const safeReason = reason ? escapeHtml(reason) : null
    const reasonMarkup = safeReason
      ? `<p><strong>Reason:</strong> ${safeReason}</p>`
      : ""

    await sendEmail({
      to,
      subject: "Update on your Finanshels partner application",
      html: buildPartnerEmailShell({
        eyebrow: "Application update",
        title: "We're unable to approve the application right now.",
        body: `
          <p>Hi ${safePartnerName},</p>
          <p>We reviewed your partner application and we're unable to approve it at this time.</p>
          ${reasonMarkup}
          <p>If this needs clarification, reply to this email and our team will help.</p>
        `,
      }),
    })
  } catch (error) {
    console.error("[notifications] sendPartnerRejectedEmail failed", {
      to,
      partnerName,
      reason,
      error: String(error),
    })
  }
}

// ─── Lead events ─────────────────────────────────────────────────────────────

export async function sendLeadSubmittedEmail(
  to: string,
  partnerName: string,
  customerName: string,
  services: string[]
): Promise<void> {
  try {
    const safePartnerName = escapeHtml(partnerName)
    const safeCustomerName = escapeHtml(customerName)
    const leadsUrl = escapeHtml(`${getPartnerPortalUrl()}/dashboard/leads`)
    const servicesMarkup =
      services.length > 0
        ? `<p><strong>Services requested:</strong> ${services.map(escapeHtml).join(", ")}</p>`
        : ""

    await sendEmail({
      to,
      subject: `Lead submitted: ${customerName}`,
      html: buildPartnerEmailShell({
        eyebrow: "Lead submitted",
        title: "Your lead has been received.",
        body: `
          <p>Hi ${safePartnerName},</p>
          <p>We've received your lead referral for <strong>${safeCustomerName}</strong> and created it in our CRM.</p>
          ${servicesMarkup}
          <p>Our team will qualify the lead and you'll receive updates as it progresses through the pipeline. Track its status in real time from your portal.</p>
        `,
        ctaLabel: "View your leads",
        ctaHref: leadsUrl,
      }),
    })
  } catch (error) {
    console.error("[notifications] sendLeadSubmittedEmail failed", {
      to,
      partnerName,
      customerName,
      error: String(error),
    })
  }
}

export async function sendLeadStatusEmail(
  to: string,
  customerName: string,
  status: string
): Promise<void> {
  try {
    const safeCustomerName = escapeHtml(customerName)
    const statusInfo = LEAD_STATUS_LABELS[status] ?? {
      label: status.replace(/_/g, " "),
      description: "The status of this lead has been updated.",
    }
    const leadsUrl = escapeHtml(`${getPartnerPortalUrl()}/dashboard/leads`)

    const isDealWon = status === "deal_won"
    const isDealLost = status === "deal_lost"

    const extraMarkup = isDealWon
      ? `<p style="margin-top:16px;padding:16px;border-radius:12px;background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.2);color:#6ee7b7;">Your commission will be calculated and added to your ledger shortly.</p>`
      : isDealLost
        ? `<p style="margin-top:16px;padding:16px;border-radius:12px;background:rgba(113,113,122,0.1);border:1px solid rgba(113,113,122,0.2);color:#a1a1aa;">Don't be discouraged — keep your pipeline active and the wins will come.</p>`
        : ""

    await sendEmail({
      to,
      subject: `Lead update: ${customerName} is now ${statusInfo.label}`,
      html: buildPartnerEmailShell({
        eyebrow: "Lead status update",
        title: `${safeCustomerName} — ${statusInfo.label}`,
        body: `
          <p>${statusInfo.description}</p>
          ${extraMarkup}
        `,
        ctaLabel: "View lead details",
        ctaHref: leadsUrl,
      }),
    })
  } catch (error) {
    console.error("[notifications] sendLeadStatusEmail failed", {
      to,
      customerName,
      status,
      error: String(error),
    })
  }
}

// ─── Commission events ────────────────────────────────────────────────────────

export async function sendCommissionApprovedEmail(
  to: string,
  amount: number,
  currency: string
): Promise<void> {
  try {
    const formattedAmount = new Intl.NumberFormat("en-AE", {
      style: "currency",
      currency,
    }).format(amount)
    const commissionsUrl = escapeHtml(`${getPartnerPortalUrl()}/dashboard/commissions`)

    await sendEmail({
      to,
      subject: `Commission approved: ${formattedAmount}`,
      html: buildPartnerEmailShell({
        eyebrow: "Commission approved",
        title: `${formattedAmount} is on its way.`,
        body: `
          <p>Your commission of <strong>${escapeHtml(formattedAmount)}</strong> has been approved and is queued for the next payout cycle.</p>
          <p>You'll receive another notification once the transfer is processed.</p>
        `,
        ctaLabel: "View commissions",
        ctaHref: commissionsUrl,
      }),
    })
  } catch (error) {
    console.error("[notifications] sendCommissionApprovedEmail failed", {
      to,
      amount,
      currency,
      error: String(error),
    })
  }
}

export async function sendCommissionPaidEmail(
  to: string,
  amount: number,
  currency: string
): Promise<void> {
  try {
    const formattedAmount = new Intl.NumberFormat("en-AE", {
      style: "currency",
      currency,
    }).format(amount)
    const commissionsUrl = escapeHtml(`${getPartnerPortalUrl()}/dashboard/commissions`)

    await sendEmail({
      to,
      subject: `Commission paid: ${formattedAmount}`,
      html: buildPartnerEmailShell({
        eyebrow: "Commission paid",
        title: `${formattedAmount} has been transferred.`,
        body: `
          <p>Your commission of <strong>${escapeHtml(formattedAmount)}</strong> has been paid out to your account.</p>
          <p>Check your bank account or review the full payment history in your portal.</p>
        `,
        ctaLabel: "View commission ledger",
        ctaHref: commissionsUrl,
      }),
    })
  } catch (error) {
    console.error("[notifications] sendCommissionPaidEmail failed", {
      to,
      amount,
      currency,
      error: String(error),
    })
  }
}

// ─── Invoice ──────────────────────────────────────────────────────────────────

export async function sendInvoiceEmail(
  to: string,
  invoiceNumber: string,
  amount: number,
  dueDate: string
): Promise<void> {
  try {
    const formattedAmount = new Intl.NumberFormat("en-AE", {
      style: "currency",
      currency: "AED",
    }).format(amount)
    const invoicesUrl = escapeHtml(`${getPartnerPortalUrl()}/dashboard/invoices`)

    await sendEmail({
      to,
      subject: `Invoice ${invoiceNumber} from Finanshels`,
      html: buildPartnerEmailShell({
        eyebrow: "New invoice",
        title: `Invoice ${escapeHtml(invoiceNumber)}`,
        body: `
          <p>A new invoice has been issued for you.</p>
          <table style="width:100%;border-collapse:collapse;margin-top:16px;">
            <tr style="border-bottom:1px solid rgba(255,255,255,0.08);">
              <td style="padding:10px 0;color:#94a3b8;font-size:13px;">Invoice number</td>
              <td style="padding:10px 0;text-align:right;color:#f1f5f9;font-weight:600;">${escapeHtml(invoiceNumber)}</td>
            </tr>
            <tr style="border-bottom:1px solid rgba(255,255,255,0.08);">
              <td style="padding:10px 0;color:#94a3b8;font-size:13px;">Amount due</td>
              <td style="padding:10px 0;text-align:right;color:#f1f5f9;font-weight:600;">${escapeHtml(formattedAmount)}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;color:#94a3b8;font-size:13px;">Due date</td>
              <td style="padding:10px 0;text-align:right;color:#f1f5f9;font-weight:600;">${escapeHtml(dueDate)}</td>
            </tr>
          </table>
        `,
        ctaLabel: "View invoice",
        ctaHref: invoicesUrl,
      }),
    })
  } catch (error) {
    console.error("[notifications] sendInvoiceEmail failed", {
      to,
      invoiceNumber,
      amount,
      dueDate,
      error: String(error),
    })
  }
}

// ─── Daily morning briefing ──────────────────────────────────────────────────

export type DailyBriefingPipeline = {
  submitted: number
  qualified: number
  proposalSent: number
  dealWon: number
  dealLost: number
}

export type DailyBriefingActiveLead = {
  name: string
  company: string | null
  status: "submitted" | "qualified" | "proposal_sent"
  daysInPipeline: number
}

export type DailyBriefingStats = {
  pipeline: DailyBriefingPipeline
  activeLeads: DailyBriefingActiveLead[]
  awaitingPayoutAed: number
  wonThisMonth: number
}

const PIPELINE_STATUS_CONFIG = {
  submitted:     { label: "Received",      dot: "#71717a", bg: "rgba(113,113,122,0.12)", border: "rgba(113,113,122,0.25)" },
  qualified:     { label: "Qualified",     dot: "#0ea5e9", bg: "rgba(14,165,233,0.10)",  border: "rgba(14,165,233,0.25)"  },
  proposal_sent: { label: "Proposal sent", dot: "#818cf8", bg: "rgba(129,140,248,0.10)", border: "rgba(129,140,248,0.25)" },
  deal_won:      { label: "Deal won",      dot: "#10b981", bg: "rgba(16,185,129,0.10)",  border: "rgba(16,185,129,0.25)"  },
}

function getDailyTip(stats: DailyBriefingStats): { headline: string; body: string } {
  const active = stats.activeLeads.length
  const total = stats.pipeline.submitted + stats.pipeline.qualified + stats.pipeline.proposalSent + stats.pipeline.dealWon

  if (total === 0) {
    return {
      headline: "Your pipeline is empty — and that's your biggest opportunity.",
      body: "Every UAE business needs VAT filing, accounting, or corporate tax help. Think of two clients you spoke to this week. One of them has a financial pain point. Submit them as a lead today — it takes under two minutes.",
    }
  }

  if (stats.pipeline.proposalSent > 0) {
    return {
      headline: `${stats.pipeline.proposalSent} client${stats.pipeline.proposalSent > 1 ? "s have" : " has"} received a proposal.`,
      body: "The best thing you can do right now is reach out to those clients directly. A quick check-in — 'Did you get a chance to review what Finanshels sent over?' — doubles conversion rates at this stage.",
    }
  }

  if (stats.pipeline.submitted > 2) {
    return {
      headline: "You have leads being reviewed — keep the momentum going.",
      body: "While Finanshels qualifies your active leads, add another one. The top-earning partners submit consistently, not in bursts. One new lead today could be your next commission in 30 days.",
    }
  }

  if (stats.wonThisMonth > 0) {
    return {
      headline: `${stats.wonThisMonth} deal${stats.wonThisMonth > 1 ? "s" : ""} won this month — now cross-sell.`,
      body: "Your recently won clients are now inside Finanshels. Use the Service Requests feature to introduce additional services — bookkeeping, VAT filing, or CFO advisory. Every service they take up earns you a commission.",
    }
  }

  return {
    headline: "Corporate Tax filing deadlines are approaching.",
    body: "Every UAE company must register and file for Corporate Tax — even if they owe zero. Most SMEs haven't done this yet. That's your referral. Ask your clients: 'Have you sorted your corporate tax registration?' If they hesitate, refer them today.",
  }
}

function buildDailyBriefingEmail(
  partnerName: string,
  stats: DailyBriefingStats,
  portalUrl: string
): string {
  const safePartnerName = escapeHtml(partnerName)
  const newLeadUrl = `${portalUrl}/dashboard/leads/new`
  const leadsUrl = `${portalUrl}/dashboard/leads`

  const today = new Date().toLocaleDateString("en-AE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })

  const formatAed = (n: number) =>
    new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED", maximumFractionDigits: 0 }).format(n)

  // Pipeline stat cells
  const pipelineEntries = Object.entries(PIPELINE_STATUS_CONFIG)
  const pipelineCells = pipelineEntries
    .map(([key, cfg]) => {
      const count = key === "deal_won"
        ? stats.pipeline.dealWon
        : key === "proposal_sent"
          ? stats.pipeline.proposalSent
          : key === "qualified"
            ? stats.pipeline.qualified
            : stats.pipeline.submitted
      return `
        <td style="padding:0 4px;text-align:center;vertical-align:top;width:25%;">
          <div style="border-radius:14px;border:1px solid ${cfg.border};background:${cfg.bg};padding:14px 8px;">
            <div style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${cfg.dot};margin-bottom:8px;"></div>
            <div style="font-size:24px;font-weight:800;color:#f1f5f9;line-height:1;">${count}</div>
            <div style="font-size:11px;color:#94a3b8;margin-top:6px;line-height:1.3;">${cfg.label}</div>
          </div>
        </td>
      `
    })
    .join("")

  // Active leads table rows
  const activeLeadsRows = stats.activeLeads
    .slice(0, 5)
    .map((lead) => {
      const cfg = PIPELINE_STATUS_CONFIG[lead.status] ?? PIPELINE_STATUS_CONFIG.submitted
      const name = escapeHtml(lead.name)
      const company = lead.company ? escapeHtml(lead.company) : null
      const ageBadge =
        lead.daysInPipeline > 14
          ? `<span style="font-size:10px;padding:2px 6px;border-radius:20px;background:rgba(245,158,11,0.15);color:#fbbf24;border:1px solid rgba(245,158,11,0.25);">${lead.daysInPipeline}d</span>`
          : `<span style="font-size:10px;padding:2px 6px;border-radius:20px;background:rgba(255,255,255,0.06);color:#6b7280;">${lead.daysInPipeline}d</span>`
      return `
        <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
          <td style="padding:10px 0;">
            <div style="font-size:13px;font-weight:600;color:#e2e8f0;">${name}</div>
            ${company ? `<div style="font-size:11px;color:#64748b;margin-top:2px;">${company}</div>` : ""}
          </td>
          <td style="padding:10px 0 10px 12px;text-align:right;white-space:nowrap;">
            <span style="display:inline-flex;align-items:center;gap:6px;">
              <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${cfg.dot};"></span>
              <span style="font-size:12px;color:#94a3b8;">${cfg.label}</span>
              ${ageBadge}
            </span>
          </td>
        </tr>
      `
    })
    .join("")

  const activeLeadsSection =
    stats.activeLeads.length > 0
      ? `
        <div style="margin-top:24px;">
          <div style="font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#6366f1;margin-bottom:12px;">Active leads</div>
          <table style="width:100%;border-collapse:collapse;">
            ${activeLeadsRows}
          </table>
          ${stats.activeLeads.length > 5 ? `<div style="font-size:12px;color:#64748b;margin-top:8px;">+${stats.activeLeads.length - 5} more in your portal</div>` : ""}
        </div>
      `
      : ""

  const awaitingPayoutBanner =
    stats.awaitingPayoutAed > 0
      ? `
        <div style="margin-bottom:24px;padding:14px 16px;border-radius:14px;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);display:flex;align-items:center;justify-content:space-between;">
          <div>
            <div style="font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#f59e0b;">Awaiting payout</div>
            <div style="font-size:22px;font-weight:800;color:#fcd34d;margin-top:4px;">${escapeHtml(formatAed(stats.awaitingPayoutAed))}</div>
          </div>
          <div style="font-size:12px;color:#92400e;max-width:140px;text-align:right;line-height:1.5;">Approved by Finanshels, transfer in progress.</div>
        </div>
      `
      : ""

  const tip = getDailyTip(stats)

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:0;background:#080810;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
      <div style="padding:32px 16px;">
        <div style="max-width:560px;margin:0 auto;">

          <!-- Logo bar -->
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:28px;">
            <div style="width:36px;height:36px;border-radius:12px;background:linear-gradient(135deg,#818cf8 0%,#4f46e5 100%);display:flex;align-items:center;justify-content:center;font-weight:900;font-size:16px;color:#fff;">F</div>
            <div>
              <div style="font-size:13px;font-weight:700;color:#fff;line-height:1;">Finanshels</div>
              <div style="font-size:10px;letter-spacing:0.24em;text-transform:uppercase;color:#4b5563;">Partner Portal</div>
            </div>
          </div>

          <!-- Main card -->
          <div style="border-radius:24px;border:1px solid rgba(255,255,255,0.07);background:#111118;padding:32px 28px;overflow:hidden;">

            <!-- Date + greeting -->
            <div style="font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#6366f1;">${escapeHtml(today)}</div>
            <h1 style="margin:10px 0 0;font-size:26px;font-weight:800;color:#f8fafc;line-height:1.2;">Good morning, ${safePartnerName}.</h1>
            <p style="margin:8px 0 0;font-size:14px;color:#64748b;line-height:1.6;">Here&rsquo;s where your pipeline stands right now.</p>

            <div style="height:1px;background:rgba(255,255,255,0.06);margin:24px 0;"></div>

            <!-- Awaiting payout banner (if applicable) -->
            ${awaitingPayoutBanner}

            <!-- Pipeline stats -->
            <div style="font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#4b5563;margin-bottom:12px;">Pipeline snapshot</div>
            <table style="width:100%;border-collapse:collapse;">
              <tr>${pipelineCells}</tr>
            </table>

            <!-- Active leads -->
            ${activeLeadsSection}

            <div style="height:1px;background:rgba(255,255,255,0.06);margin:24px 0;"></div>

            <!-- Daily tip -->
            <div style="border-radius:16px;background:rgba(99,102,241,0.07);border:1px solid rgba(99,102,241,0.18);padding:20px;">
              <div style="font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#6366f1;margin-bottom:8px;">Today&rsquo;s tip</div>
              <div style="font-size:14px;font-weight:700;color:#e2e8f0;line-height:1.4;margin-bottom:8px;">${escapeHtml(tip.headline)}</div>
              <div style="font-size:13px;color:#94a3b8;line-height:1.7;">${tip.body}</div>
            </div>

            <!-- CTA -->
            <div style="text-align:center;margin-top:28px;">
              <a href="${escapeHtml(newLeadUrl)}" style="display:inline-block;padding:14px 32px;border-radius:9999px;background:linear-gradient(135deg,#818cf8 0%,#4f46e5 100%);color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:0.01em;box-shadow:0 8px 24px rgba(99,102,241,0.35);">
                Submit a lead today →
              </a>
              <div style="margin-top:12px;">
                <a href="${escapeHtml(leadsUrl)}" style="font-size:12px;color:#6366f1;text-decoration:none;">View all leads</a>
              </div>
            </div>

          </div>

          <!-- Footer -->
          <div style="margin-top:20px;text-align:center;font-size:11px;color:#374151;line-height:1.6;">
            You receive this every morning as a Finanshels partner.<br>
            Questions? Reply to this email.
          </div>

        </div>
      </div>
    </body>
    </html>
  `
}

export async function sendDailyMorningBriefingEmail(
  to: string,
  partnerName: string,
  stats: DailyBriefingStats
): Promise<void> {
  try {
    const activeTotal =
      stats.pipeline.submitted + stats.pipeline.qualified + stats.pipeline.proposalSent

    const subject =
      activeTotal > 0
        ? `Your pipeline: ${activeTotal} active lead${activeTotal !== 1 ? "s" : ""} — ${new Date().toLocaleDateString("en-AE", { weekday: "short", day: "numeric", month: "short" })}`
        : `Good morning — your Finanshels briefing, ${new Date().toLocaleDateString("en-AE", { weekday: "short", day: "numeric", month: "short" })}`

    await sendEmail({
      to,
      subject,
      html: buildDailyBriefingEmail(partnerName, stats, getPartnerPortalUrl()),
    })
  } catch (error) {
    console.error("[notifications] sendDailyMorningBriefingEmail failed", {
      to,
      partnerName,
      error: String(error),
    })
  }
}

// ─── Weekly newsletter ────────────────────────────────────────────────────────

export type WeeklyNewsletterStats = {
  leadsThisMonth: number
  leadsTotal: number
  wonTotal: number
  commissionsEarned: number // AED total approved+paid
  commissionsPending: number // AED calculating
}

const NEWSLETTER_TIPS = [
  {
    heading: "Refer clients needing VAT registration",
    body: "Any business exceeding AED 375,000 in taxable supplies must register for VAT. If your client is growing, this is a guaranteed need. Ask: <em>\"Is your revenue approaching the VAT threshold?\"</em>",
  },
  {
    heading: "Corporate Tax — every UAE company needs this",
    body: "Since June 2023, UAE corporate tax is mandatory. If your client hasn't registered or filed yet, they're at risk. This is an easy, high-urgency referral to make.",
  },
  {
    heading: "Use service requests for your won clients",
    body: "Already helped a client get onboarded with Finanshels? Submit a service request for additional services — bookkeeping, financial modelling, or CFO advisory. You earn a commission on every one.",
  },
  {
    heading: "Qualify with one question",
    body: "\"Do you have an in-house finance team?\" If no, they likely need accounting, VAT filing, or management reporting. Most SMEs outsource this — that's your opening.",
  },
  {
    heading: "Real estate clients need AML compliance",
    body: "Property developers and brokers in UAE are subject to AML regulations. If you work with real estate clients, flag Finanshels' AML compliance service — it's often overlooked and urgently needed.",
  },
  {
    heading: "Year-end is audit season",
    body: "Companies with annual revenue above certain thresholds or those with free zone licenses often need audited financial statements. Q4 is the best time to mention this.",
  },
  {
    heading: "CFO services for fast-growing startups",
    body: "Startups raising funding or seeking bank facilities need more than bookkeeping — they need strategic finance. Introduce them to Finanshels' Fractional CFO service.",
  },
]

function getWeeklyTips(seed: number, count = 3) {
  const shuffled = [...NEWSLETTER_TIPS].sort(() => (seed % 7) - 3.5)
  return shuffled.slice(0, count)
}

export async function sendWeeklyNewsletterEmail(
  to: string,
  partnerName: string,
  stats: WeeklyNewsletterStats,
  weekSeed: number
): Promise<void> {
  try {
    const safePartnerName = escapeHtml(partnerName)
    const portalUrl = escapeHtml(`${getPartnerPortalUrl()}/dashboard`)
    const tips = getWeeklyTips(weekSeed)

    const formatAed = (n: number) =>
      new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED", maximumFractionDigits: 0 }).format(n)

    const statsHtml = `
      <table style="width:100%;border-collapse:collapse;margin:20px 0 28px;">
        <tr>
          <td style="padding:14px;border-radius:12px;background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.2);text-align:center;width:25%;">
            <div style="font-size:22px;font-weight:800;color:#a5b4fc;">${stats.leadsThisMonth}</div>
            <div style="font-size:11px;color:#94a3b8;margin-top:4px;">Leads this month</div>
          </td>
          <td style="width:8px;"></td>
          <td style="padding:14px;border-radius:12px;background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.18);text-align:center;width:25%;">
            <div style="font-size:22px;font-weight:800;color:#6ee7b7;">${stats.wonTotal}</div>
            <div style="font-size:11px;color:#94a3b8;margin-top:4px;">Deals won</div>
          </td>
          <td style="width:8px;"></td>
          <td style="padding:14px;border-radius:12px;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.18);text-align:center;width:42%;">
            <div style="font-size:22px;font-weight:800;color:#fcd34d;">${formatAed(stats.commissionsEarned)}</div>
            <div style="font-size:11px;color:#94a3b8;margin-top:4px;">Total earned</div>
          </td>
        </tr>
      </table>
    `

    const tipsHtml = tips
      .map(
        (tip) => `
        <div style="margin-bottom:20px;padding:18px;border-radius:14px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);">
          <div style="font-size:14px;font-weight:700;color:#e2e8f0;margin-bottom:6px;">${tip.heading}</div>
          <div style="font-size:14px;color:#94a3b8;line-height:1.7;">${tip.body}</div>
        </div>
      `
      )
      .join("")

    const pendingNote =
      stats.commissionsPending > 0
        ? `<p style="margin-top:20px;font-size:13px;color:#94a3b8;">You also have <strong style="color:#fbbf24;">${formatAed(stats.commissionsPending)}</strong> in commissions currently being reviewed.</p>`
        : ""

    await sendEmail({
      to,
      subject: `Your weekly partner update — ${new Date().toLocaleDateString("en-AE", { day: "numeric", month: "short" })}`,
      html: buildPartnerEmailShell({
        eyebrow: "Weekly partner digest",
        title: `Hi ${safePartnerName}, here's your week.`,
        body: `
          <p>Here's a quick snapshot of your partner activity and some tips to help you grow your commissions this week.</p>
          ${statsHtml}
          ${pendingNote}
          <div style="margin-top:28px;margin-bottom:16px;font-size:13px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#6366f1;">This week's selling tips</div>
          ${tipsHtml}
          <p style="margin-top:24px;font-size:14px;color:#94a3b8;">Keep building your pipeline — every lead you submit is a step closer to your next commission.</p>
        `,
        ctaLabel: "Open your dashboard",
        ctaHref: portalUrl,
      }),
    })
  } catch (error) {
    console.error("[notifications] sendWeeklyNewsletterEmail failed", {
      to,
      partnerName,
      error: String(error),
    })
  }
}
