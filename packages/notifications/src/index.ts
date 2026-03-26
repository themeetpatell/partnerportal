import sgMail from "@sendgrid/mail"

const apiKey = process.env.SENDGRID_API_KEY
if (apiKey) {
  sgMail.setApiKey(apiKey)
}

const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || "noreply@finanshels.com"

export async function sendWelcomeEmail(to: string, partnerName: string): Promise<void> {
  try {
    await sgMail.send({
      to,
      from: FROM_EMAIL,
      subject: "Welcome to the Finanshels Partner Program!",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>Welcome, ${partnerName}!</h1>
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

export async function sendLeadStatusEmail(
  to: string,
  customerName: string,
  status: string
): Promise<void> {
  try {
    await sgMail.send({
      to,
      from: FROM_EMAIL,
      subject: `Lead Status Update: ${customerName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>Lead Status Update</h1>
          <p>The status of your referred lead <strong>${customerName}</strong> has been updated to: <strong>${status}</strong>.</p>
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

    await sgMail.send({
      to,
      from: FROM_EMAIL,
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

    await sgMail.send({
      to,
      from: FROM_EMAIL,
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
