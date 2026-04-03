import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  return NextResponse.redirect(
    new URL("/api/profile/contract/start-sign", request.url)
  )
}
