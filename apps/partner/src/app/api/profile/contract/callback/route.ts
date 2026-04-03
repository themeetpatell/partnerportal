import { auth } from "@repo/auth/server"
import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db, partners } from "@repo/db"
import { syncZohoSignedContract } from "@/lib/zoho-sign-contract"

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
    return redirectToProfile(request, { contract: "auth-required" })
  }

  const [partner] = await db
    .select()
    .from(partners)
    .where(eq(partners.authUserId, userId))
    .limit(1)

  if (!partner) {
    return redirectToProfile(request, { contract: "missing-partner" })
  }

  const state = request.nextUrl.searchParams.get("state") || ""

  if (state === "declined") {
    return redirectToProfile(request, { contract: "declined" })
  }

  if (state === "later") {
    return redirectToProfile(request, { contract: "later" })
  }

  const result = await syncZohoSignedContract(partner)

  return redirectToProfile(request, {
    contract: result.completed ? "signed" : "pending",
  })
}
