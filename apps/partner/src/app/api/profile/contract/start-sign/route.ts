import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const url = new URL("/dashboard/profile", request.url)
  url.searchParams.set("contract", "ready")
  return NextResponse.redirect(url)
}
