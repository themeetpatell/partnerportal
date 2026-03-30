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

export async function sendWelcomeEmail(to: string, partnerName: string): Promise<void> {
  try {
    const safePartnerName = escapeHtml(partnerName)

    await sendEmail({
      to,
      subject: "Welcome to the Finanshels Partner Program!",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>Welcome, ${safePartnerName}!</h1>
          <p>Your partner application has been approved. You can now log in to the Finanshels Partner Portal to start referring clients and tracking your commissions.</p>
          <p>If you have any questions, please don't hesitate to reach out to our partner support team.</p>
          <p>Best regards,<br/>The Finanshels Team</p>
        </div>
      `,
    })
  } catch (error) {
    console.error("[notifications] sendWelcomeEmail failed", {
      to,
      partnerName,
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
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>Application received</h1>
          <p>Hi ${safePartnerName},</p>
          <p>We received your ${partnerTypeLabel} application for <strong>${safeCompanyName}</strong>.</p>
          <p>Our team will review it and follow up by email once the review is complete.</p>
          <p>Best regards,<br/>The Finanshels Team</p>
        </div>
      `,
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
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>Application update</h1>
          <p>Hi ${safePartnerName},</p>
          <p>We reviewed your partner application and we are unable to approve it at this time.</p>
          ${reasonMarkup}
          <p>If you believe this needs clarification, reply to this email and our team will help.</p>
          <p>Best regards,<br/>The Finanshels Team</p>
        </div>
      `,
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
