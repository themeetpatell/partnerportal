import { auth, currentUser } from "@repo/auth/server"
import { NextRequest, NextResponse } from "next/server"
import { db, partners } from "@repo/db"
import { eq } from "drizzle-orm"
import { createClient } from "@supabase/supabase-js"
import { getPartnerRecordForAuthenticatedUser } from "@/lib/partner-record"

const BUCKET = "partner-avatars"
const MAX_SIZE = 5 * 1024 * 1024 // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]

function supabaseServiceKey(): string | null {
  return (
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    null
  )
}

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = supabaseServiceKey()
  if (!url || !key) {
    return null
  }
  return createClient(url, key, { auth: { persistSession: false } })
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
    if (!client) {
      return NextResponse.json(
        {
          error:
            "Avatar storage is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (Supabase service role) in the partner app environment.",
        },
        { status: 503 },
      )
    }

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
      const hint =
        process.env.NODE_ENV === "development"
          ? uploadErr.message
          : "Check Supabase Storage: bucket policies and that the secret key is the service role."
      return NextResponse.json({ error: `Upload failed. ${hint}` }, { status: 500 })
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
