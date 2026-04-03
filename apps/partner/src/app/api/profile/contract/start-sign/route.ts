import { auth } from "@repo/auth/server"
import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db, partners } from "@repo/db"
import { createZohoContractSigningUrl } from "@/lib/zoho-sign-contract"

function redirectToProfile(request: NextRequest, params: Record<string, string>) {
  const url = new URL("/dashboard/profile", request.url)

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }

  return NextResponse.redirect(url)
}

export async function GET(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const [partner] = await db
    .select()
    .from(partners)
    .where(eq(partners.authUserId, userId))
    .limit(1)

  if (!partner) {
    return NextResponse.json({ error: "Partner record not found." }, { status: 404 })
  }

  if (!partner.agreementUrl || partner.contractStatus === "not_sent") {
    return redirectToProfile(request, { contract: "not-sent" })
  }

  const result = await createZohoContractSigningUrl(partner)

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
