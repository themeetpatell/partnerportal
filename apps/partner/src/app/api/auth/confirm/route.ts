import { NextResponse } from "next/server"

// This endpoint has been replaced by /api/auth/send-otp and /api/auth/verify-otp
export async function POST() {
  return NextResponse.json(
    { error: "This endpoint has been replaced by /api/auth/send-otp and /api/auth/verify-otp" },
    { status: 410 }
  )
}
