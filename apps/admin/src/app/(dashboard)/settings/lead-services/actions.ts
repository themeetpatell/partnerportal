"use server"

import { revalidatePath } from "next/cache"
import { db, leadCatalogItems } from "@repo/db"
import { and, eq } from "drizzle-orm"
import { getCurrentActiveTeamMember } from "@/lib/admin-auth"
import { getRequiredTenantId } from "@/lib/env"
import { hasAnyTeamRole, LEAD_SERVICE_CATALOG_SETTINGS_ROLES } from "@/lib/rbac"

async function requireCatalogEditor() {
  const member = await getCurrentActiveTeamMember()
  if (!member || !hasAnyTeamRole(member.role, LEAD_SERVICE_CATALOG_SETTINGS_ROLES)) {
    throw new Error("You do not have permission to edit the lead services catalog.")
  }
}

function parseSortOrder(raw: FormDataEntryValue | null): number {
  const n = Number(typeof raw === "string" ? raw : "")
  if (!Number.isFinite(n)) return 0
  return Math.round(n)
}

export async function createLeadCatalogItem(formData: FormData): Promise<void> {
  await requireCatalogEditor()

  const tenantId = getRequiredTenantId()
  const name = String(formData.get("name") ?? "").trim()
  const code = String(formData.get("code") ?? "").trim()
  const sortOrder = parseSortOrder(formData.get("sortOrder"))

  if (!name || !code) {
    throw new Error("Name and code are required.")
  }

  try {
    await db.insert(leadCatalogItems).values({
      tenantId,
      name,
      code,
      sortOrder,
      isActive: true,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes("unique") || msg.includes("duplicate")) {
      throw new Error("A service with this name already exists for your tenant.")
    }
    throw new Error("Could not add service.")
  }

  revalidatePath("/settings/lead-services")
}

export async function updateLeadCatalogItem(id: string, formData: FormData): Promise<void> {
  await requireCatalogEditor()

  const tenantId = getRequiredTenantId()
  const name = String(formData.get("name") ?? "").trim()
  const code = String(formData.get("code") ?? "").trim()
  const sortOrder = parseSortOrder(formData.get("sortOrder"))
  const isActive = String(formData.get("isActive") ?? "") === "true"

  if (!name || !code) {
    throw new Error("Name and code are required.")
  }

  try {
    const [updated] = await db
      .update(leadCatalogItems)
      .set({
        name,
        code,
        sortOrder,
        isActive,
        updatedAt: new Date(),
      })
      .where(and(eq(leadCatalogItems.tenantId, tenantId), eq(leadCatalogItems.id, id)))
      .returning({ id: leadCatalogItems.id })

    if (!updated) {
      throw new Error("Service not found.")
    }
  } catch (e: unknown) {
    if (e instanceof Error && (e.message === "Service not found." || e.message.includes("Name and code"))) {
      throw e
    }
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes("unique") || msg.includes("duplicate")) {
      throw new Error("Another row already uses this service name.")
    }
    throw new Error("Could not update service.")
  }

  revalidatePath("/settings/lead-services")
}

export async function deleteLeadCatalogItem(id: string): Promise<void> {
  await requireCatalogEditor()

  const tenantId = getRequiredTenantId()

  await db
    .delete(leadCatalogItems)
    .where(and(eq(leadCatalogItems.tenantId, tenantId), eq(leadCatalogItems.id, id)))

  revalidatePath("/settings/lead-services")
}
