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
      </div>
    </div>
  `
}

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
      subject: "Your Finanshels partner account is now active",
      html: buildPartnerEmailShell({
        eyebrow: "Partner approved",
        title: "Your workspace is now active.",
        body: `
          <p>Hi ${safePartnerName},</p>
          <p>Your partner application for <strong>${safeCompanyName}</strong> has been approved by the Finanshels team.</p>
          <p>You can now sign in to access the full partner workspace, submit leads, create service requests, and track commissions.</p>
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
        title: "We’re unable to approve the application right now.",
        body: `
          <p>Hi ${safePartnerName},</p>
          <p>We reviewed your partner application and we’re unable to approve it at this time.</p>
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

export async function sendLeadStatusEmail(
  to: string,
  customerName: string,
  status: string
): Promise<void> {
  try {
    const safeCustomerName = escapeHtml(customerName)
    const safeStatus = escapeHtml(status)

    await sendEmail({
      to,
      subject: `Lead Status Update: ${customerName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>Lead Status Update</h1>
          <p>The status of your referred lead <strong>${safeCustomerName}</strong> has been updated to: <strong>${safeStatus}</strong>.</p>
          <p>Log in to your Partner Portal to view more details.</p>
          <p>Best regards,<br/>The Finanshels Team</p>
        </div>
      `,
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

export async function sendCommissionApprovedEmail(
  to: string,
  amount: number,
  currency: string
): Promise<void> {
  try {
    const formattedAmount = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount)

    await sendEmail({
      to,
      subject: `Commission Approved: ${formattedAmount}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>Commission Approved</h1>
          <p>Your commission of <strong>${formattedAmount}</strong> has been approved and is ready for payout processing.</p>
          <p>Log in to your Partner Portal to review your commission details.</p>
          <p>Best regards,<br/>The Finanshels Team</p>
        </div>
      `,
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
    const formattedAmount = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount)

    await sendEmail({
      to,
      subject: `Commission Payment: ${formattedAmount}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>Commission Payment Processed</h1>
          <p>Great news! A commission payment of <strong>${formattedAmount}</strong> has been processed for your account.</p>
          <p>Log in to your Partner Portal to view your full commission history and payout details.</p>
          <p>Best regards,<br/>The Finanshels Team</p>
        </div>
      `,
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

export async function sendInvoiceEmail(
  to: string,
  invoiceNumber: string,
  amount: number,
  dueDate: string
): Promise<void> {
  try {
    const formattedAmount = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)

    await sendEmail({
      to,
      subject: `Invoice ${invoiceNumber} from Finanshels`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>Invoice ${invoiceNumber}</h1>
          <p>Please find your invoice details below:</p>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Invoice Number</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${invoiceNumber}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Amount Due</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${formattedAmount}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Due Date</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${dueDate}</td>
            </tr>
          </table>
          <p>Log in to your Partner Portal to view and download the full invoice.</p>
          <p>Best regards,<br/>The Finanshels Team</p>
        </div>
      `,
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
