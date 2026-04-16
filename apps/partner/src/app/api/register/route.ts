import { auth } from "@repo/auth/server"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@repo/db"
import { documents, partners, tenants } from "@repo/db"
import { eq } from "drizzle-orm"
import { sendPartnerApplicationReceivedEmail } from "@repo/notifications"
import { rateLimit, getClientIp } from "@repo/auth"
import {
  createSignedAgreementPdf,
  getAgreementFilePath,
  getAgreementTitle,
} from "@/lib/signed-agreement"

function getTenantId(): string {
  const id = process.env.DEFAULT_TENANT_ID
  if (!id) {
    throw new Error("DEFAULT_TENANT_ID environment variable is required")
  }
  return id
}

async function ensureDefaultTenantExists(tenantId: string) {
  const [existingTenant] = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1)

  if (existingTenant) {
    return
  }

  const defaultTenantSlug =
    process.env.DEFAULT_TENANT_SLUG?.trim() || "finanshels"
  const defaultTenantName =
    process.env.DEFAULT_TENANT_NAME?.trim() || "Finanshels"

  await db
    .insert(tenants)
    .values({
      id: tenantId,
      name: defaultTenantName,
      slug: defaultTenantSlug,
      plan: "enterprise",
      isActive: true,
    })
    .onConflictDoNothing()
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function parseSignatureDataUrl(dataUrl: string | null | undefined) {
  const value = dataUrl?.trim()
  if (!value || !value.startsWith("data:")) {
    return null
  }

  const match = value.match(/^data:(.+?);base64,(.+)$/)
  if (!match) {
    return null
  }

  const [, mimeType, base64Payload] = match
  return {
    mimeType,
    bytes: Buffer.from(base64Payload, "base64"),
  }
}

const registerSchema = z.object({
  companyName: z.string().max(255).optional().default(""),
  contactName: z.string().min(1, "Contact name is required").max(255),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional().default(""),
  type: z.enum(["referral", "channel"]),
  agreedToTerms: z.literal(true, {
    errorMap: () => ({ message: "You must confirm the agreement review." }),
  }),
  signatureType: z.enum(["typed", "drawn"]),
  signatureName: z.string().trim().min(1, "Signature name is required.").max(255),
  signatureDataUrl: z.string().max(2_000_000).nullable().optional(),
}).superRefine((data, ctx) => {
  if (data.signatureType === "drawn" && !data.signatureDataUrl) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["signatureDataUrl"],
      message: "Drawn signature is required.",
    })
  }
  if (data.type === "channel" && !data.companyName?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["companyName"],
      message: "Company name is required for channel partners.",
    })
  }
})

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 5 registrations per IP per minute
    const limited = rateLimit(`register:${getClientIp(request.headers)}`, 5, 60_000)
    if (limited) return limited

    // Auth check
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to register as a partner." },
        { status: 401 }
      )
    }

    // Check if already registered
    const existingPartner = await db
      .select()
      .from(partners)
      .where(eq(partners.authUserId, userId))
      .limit(1)

    if (existingPartner.length > 0) {
      return NextResponse.json(
        { error: "You already have a partner account." },
        { status: 409 }
      )
    }

    // Parse and validate body
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body." },
        { status: 400 }
      )
    }

    const parsed = registerSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]
      return NextResponse.json(
        {
          error: firstError?.message ?? "Validation failed.",
          issues: parsed.error.issues,
        },
        { status: 422 }
      )
    }

    const {
      companyName,
      contactName,
      email,
      phone,
      type,
      signatureType,
      signatureName,
      signatureDataUrl,
    } = parsed.data
    const tenantId = getTenantId()
    const now = new Date()
    const normalizedEmail = email.trim().toLowerCase()

    await ensureDefaultTenantExists(tenantId)

    // Insert partner record
    const [newPartner] = await db
      .insert(partners)
      .values({
        tenantId,
        authUserId: userId,
        type,
        companyName,
        contactName,
        email: normalizedEmail,
        phone: phone || null,
        status: "pending",
        contractStatus: "signed",
        contractSignedAt: now,
        contractSignedName: signatureName,
        contractSignatureType: signatureType,
        contractSignatureDataUrl: signatureDataUrl ?? null,
        agreementUrl: "/onboarding",
      })
      .returning()

    const parsedSignature = parseSignatureDataUrl(signatureDataUrl)
    const signedPdf = await createSignedAgreementPdf({
      agreementFilePath: getAgreementFilePath(type),
      agreementTitle: getAgreementTitle(type),
      partnerCompanyName: companyName,
      partnerTypeLabel: type === "channel" ? "Channel Partner" : "Referral Partner",
      partner: {
        type,
        companyName,
        contactName,
        email: normalizedEmail,
        designation: null,
        partnerAddress: null,
        emirateIdPassport: null,
        tradeLicense: null,
        beneficiaryName: null,
        bankName: null,
        bankCountry: null,
        accountNoIban: null,
        swiftBicCode: null,
        contractSentAt: now,
      },
      signerName: signatureName,
      signerDesignation: null,
      signerEmail: normalizedEmail,
      signatureType: parsedSignature ? "upload" : "typed",
      signedAt: now,
      signatureImageBytes: parsedSignature?.bytes ?? null,
      signatureImageMimeType: parsedSignature?.mimeType ?? null,
    })

    await db.insert(documents).values({
      tenantId,
      ownerType: "partner",
      ownerId: newPartner.id,
      documentType: "signed_agreement_pdf",
      fileName: `${slugify(companyName) || "partner"}-signed-agreement.pdf`,
      zohoWorkdriveId: `in-app:${newPartner.id}:signed_agreement`,
      zohoWorkdriveUrl: `db://documents/${newPartner.id}/signed-agreement`,
      storageProvider: "database",
      mimeType: "application/pdf",
      fileDataBase64: signedPdf.toString("base64"),
      uploadedBy: userId,
    })

    await sendPartnerApplicationReceivedEmail(
      newPartner.email,
      newPartner.contactName,
      newPartner.companyName,
      newPartner.type as "referral" | "channel"
    )

    return NextResponse.json(
      {
        partner: {
          id: newPartner.id,
          type: newPartner.type,
          companyName: newPartner.companyName,
          contactName: newPartner.contactName,
          email: newPartner.email,
          status: newPartner.status,
          createdAt: newPartner.createdAt,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("[POST /api/register] Error:", error)

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23503"
    ) {
      return NextResponse.json(
        {
          error:
            "Partner onboarding is blocked because the default tenant is not initialized correctly.",
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    )
  }
}
