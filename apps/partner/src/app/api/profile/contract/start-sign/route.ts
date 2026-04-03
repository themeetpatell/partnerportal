import { auth, currentUser } from "@repo/auth/server"
import { NextRequest, NextResponse } from "next/server"
import { createZohoContractSigningUrl } from "@/lib/zoho-sign-contract"
import { getPartnerRecordForAuthenticatedUser } from "@/lib/partner-record"

function redirectToProfile(request: NextRequest, params: Record<string, string>) {
  const url = new URL("/dashboard/profile", request.url)

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }

  return NextResponse.redirect(url)
}

function getContractUnavailableReason(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)

  if (message.includes("Upgrade Zoho Sign license to send documents via API")) {
    return "Zoho Sign API access is not enabled on the current Zoho Sign plan."
  }

  if (message.includes("\"error\":\"invalid_client\"")) {
    return "Zoho rejected the configured Zoho Sign client ID or client secret. Update the production Zoho Sign OAuth credentials."
  }

  if (message.includes("token refresh")) {
    return "Zoho Sign authentication failed. Please reconnect the Zoho Sign credentials."
  }

  return `Zoho Sign error: ${message}`
}

export async function GET(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const user = await currentUser()
  const partner = await getPartnerRecordForAuthenticatedUser({
    userId,
    email: user?.email,
  })

  if (!partner) {
    return NextResponse.json({ error: "Partner record not found." }, { status: 404 })
  }

  if (partner.contractStatus === "not_sent") {
    return redirectToProfile(request, { contract: "not-sent" })
  }

  let result: Awaited<ReturnType<typeof createZohoContractSigningUrl>>

  try {
    result = await createZohoContractSigningUrl(partner)
  } catch (error) {
    console.error("[start-sign] Zoho signing URL failed:", error)
    return redirectToProfile(request, {
      contract: "unavailable",
      reason: getContractUnavailableReason(error),
    })
  }

  if ("error" in result) {
    return redirectToProfile(request, {
      contract: "missing-fields",
      reason: result.error || "Missing required agreement details.",
    })
  }

  if (result.completed || result.partner.contractSignedAt) {
    return redirectToProfile(request, { contract: "signed" })
  }

  return NextResponse.redirect(result.signUrl)
}
