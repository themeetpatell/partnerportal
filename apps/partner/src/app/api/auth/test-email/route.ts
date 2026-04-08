import { NextRequest, NextResponse } from "next/server"
import sgMail from "@sendgrid/mail"

// Temporary diagnostic endpoint — remove after confirming emails work
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const to = typeof body?.to === "string" ? body.to.trim() : ""

  if (!to) {
    return NextResponse.json({ error: "to is required" }, { status: 400 })
  }

  const key = process.env.SENDGRID_API_KEY?.trim()
  const from = process.env.SENDGRID_FROM_EMAIL?.trim() || "meet@finanshels.com"

  if (!key) {
    return NextResponse.json(
      { error: "SENDGRID_API_KEY is not set in this environment" },
      { status: 500 }
    )
  }

  sgMail.setApiKey(key)

  try {
    const [response] = await sgMail.send({
      to,
      from: { email: from, name: "Finanshels" },
      subject: "Finanshels Email Test",
      html: `<p>This is a test email from <strong>production</strong>.</p>
             <p>From: ${from}</p>
             <p>To: ${to}</p>
             <p>Timestamp: ${new Date().toISOString()}</p>`,
    })

    return NextResponse.json({
      ok: true,
      statusCode: response.statusCode,
      from,
      to,
    })
  } catch (err: unknown) {
    const sgErr = err as { response?: { statusCode?: number; body?: unknown }; message?: string }
    return NextResponse.json(
      {
        error: "SendGrid send failed",
        statusCode: sgErr.response?.statusCode,
        body: sgErr.response?.body,
        message: sgErr.message,
        from,
      },
      { status: 500 }
    )
  }
}
