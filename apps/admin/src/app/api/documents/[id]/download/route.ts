import { auth } from "@repo/auth/server"
import { NextRequest, NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { db, documents } from "@repo/db"
import { getActiveTeamMember } from "@/lib/admin-auth"
import { getRequiredTenantId } from "@/lib/env"
import { hasModuleAccess, type AccessModule } from "@/lib/rbac"

function sanitizeFileNameForDisposition(name: string) {
  const stripped = name.replace(/[\r\n"\\]/g, "_").trim()
  return stripped.slice(0, 180) || "document"
}

const OWNER_MODULE: Record<string, AccessModule | undefined> = {
  partner: "partners",
  lead: "leads",
  service_request: "services",
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const member = await getActiveTeamMember(userId)
  if (!member) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const tenantId = getRequiredTenantId()

  const { id } = await params

  const [document] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, id), eq(documents.tenantId, tenantId)))
    .limit(1)

  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 })
  }

  const requiredModule = OWNER_MODULE[document.ownerType]
  if (
    !requiredModule ||
    !hasModuleAccess(member.role, member.permissions, requiredModule, "r")
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const safeName = sanitizeFileNameForDisposition(document.fileName)

  if (document.storageProvider === "database" && document.fileDataBase64) {
    const bytes = Buffer.from(document.fileDataBase64, "base64")
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": document.mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${safeName}"`,
      },
    })
  }

  return NextResponse.redirect(document.zohoWorkdriveUrl)
}
