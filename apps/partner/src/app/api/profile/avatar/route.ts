import { auth, currentUser } from "@repo/auth/server"
import { NextRequest, NextResponse } from "next/server"
import { db, partners } from "@repo/db"
import { eq } from "drizzle-orm"
import { createClient } from "@supabase/supabase-js"
import { getPartnerRecordForAuthenticatedUser } from "@/lib/partner-record"

const BUCKET = "partner-avatars"
const MAX_SIZE = 5 * 1024 * 1024 // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
    }

    const user = await currentUser()
    const partner = await getPartnerRecordForAuthenticatedUser({ userId, email: user?.email })
    if (!partner) {
      return NextResponse.json({ error: "Partner record not found." }, { status: 404 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "File must be JPEG, PNG, WebP, or GIF." },
        { status: 400 }
      )
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File must be under 5 MB." }, { status: 400 })
    }

    const ext = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1]
    const filePath = `${partner.id}/avatar.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const client = supabaseAdmin()

    // Create bucket if it doesn't exist
    const { error: bucketErr } = await client.storage.createBucket(BUCKET, {
      public: true,
      allowedMimeTypes: ALLOWED_TYPES,
      fileSizeLimit: MAX_SIZE,
    })
    if (bucketErr && !bucketErr.message.toLowerCase().includes("already exists")) {
      console.error("[avatar] bucket create:", bucketErr)
    }

    const { error: uploadErr } = await client.storage
      .from(BUCKET)
      .upload(filePath, buffer, { contentType: file.type, upsert: true })

    if (uploadErr) {
      console.error("[avatar] upload:", uploadErr)
      return NextResponse.json({ error: "Upload failed." }, { status: 500 })
    }

    const { data: { publicUrl } } = client.storage.from(BUCKET).getPublicUrl(filePath)
    // Cache-bust so the browser fetches the new image after re-upload
    const url = `${publicUrl}?t=${Date.now()}`

    await db
      .update(partners)
      .set({ profileImageUrl: url, updatedAt: new Date() })
      .where(eq(partners.id, partner.id))

    return NextResponse.json({ url })
  } catch (error) {
    console.error("[POST /api/profile/avatar]", error)
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 })
  }
}
