import { auth } from "@repo/auth/server"
import { NextRequest, NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { createClient } from "@supabase/supabase-js"
import { db, teamMembers, logActivity } from "@repo/db"
import { rateLimit } from "@repo/auth"
import { getActorName, getActiveTeamMember } from "@/lib/admin-auth"
import { getRequiredTenantId } from "@/lib/env"

const BUCKET = "admin-team-avatars"
const MAX_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]

function supabaseServiceKey(): string | null {
  return (
    process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || null
  )
}

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = supabaseServiceKey()
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const limited = rateLimit(`admin-profile:avatar:${userId}`, 15, 60_000)
  if (limited) return limited

  const member = await getActiveTeamMember(userId)
  if (!member) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const tenantId = getRequiredTenantId()

  const formData = await request.formData()
  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 })
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "File must be JPEG, PNG, WebP, or GIF." },
      { status: 400 },
    )
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File must be under 5 MB." }, { status: 400 })
  }

  const client = supabaseAdmin()
  if (!client) {
    return NextResponse.json(
      {
        error:
          "Avatar storage is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY.",
      },
      { status: 503 },
    )
  }

  const ext = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1]
  const filePath = `${member.id}/avatar.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: bucketErr } = await client.storage.createBucket(BUCKET, {
    public: true,
    allowedMimeTypes: ALLOWED_TYPES,
    fileSizeLimit: MAX_SIZE,
  })
  if (bucketErr && !bucketErr.message.toLowerCase().includes("already exists")) {
    console.error("[admin profile avatar] bucket:", bucketErr)
  }

  const { error: uploadErr } = await client.storage
    .from(BUCKET)
    .upload(filePath, buffer, { contentType: file.type, upsert: true })

  if (uploadErr) {
    console.error("[admin profile avatar] upload:", uploadErr)
    return NextResponse.json({ error: "Upload failed. Check Storage policies and service role." }, { status: 500 })
  }

  const {
    data: { publicUrl },
  } = client.storage.from(BUCKET).getPublicUrl(filePath)
  const url = `${publicUrl}?t=${Date.now()}`

  const [updated] = await db
    .update(teamMembers)
    .set({ avatarUrl: url, updatedAt: new Date() })
    .where(and(eq(teamMembers.id, member.id), eq(teamMembers.tenantId, tenantId)))
    .returning()

  if (!updated) {
    return NextResponse.json({ error: "Could not save avatar URL" }, { status: 500 })
  }

  try {
    await client.auth.admin.updateUserById(userId, {
      user_metadata: { avatar_url: url },
    })
  } catch {
    /* ignore */
  }

  const actorName = await getActorName()
  await logActivity({
    tenantId,
    entityType: "team_member",
    entityId: member.id,
    actorId: userId,
    actorName,
    action: "team_member.avatar_updated",
  })

  return NextResponse.json({ url })
}
