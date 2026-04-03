import { auth, currentUser } from "@repo/auth/server"
import { rateLimit } from "@repo/auth"
import { db, documents, logActivity, partners } from "@repo/db"
import { and, desc, eq } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"
import {
  createSignedAgreementPdf,
  getAgreementFilePath,
  getAgreementTitle,
  getMissingAgreementFields,
} from "@/lib/signed-agreement"
import { getPartnerRecordForAuthenticatedUser } from "@/lib/partner-record"

function redirectToProfile(request: NextRequest, params: Record<string, string>) {
  const url = new URL("/dashboard/profile", request.url)

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }

  return NextResponse.redirect(url, { status: 303 })
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function toDataUrl(mimeType: string, bytes: Buffer) {
  return `data:${mimeType};base64,${bytes.toString("base64")}`
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const limited = rateLimit(`contract:sign:${userId}`, 10, 60_000)
    if (limited) return limited

    const user = await currentUser()
    const partner = await getPartnerRecordForAuthenticatedUser({
      userId,
      email: user?.email,
    })

    if (!partner) {
      return NextResponse.json({ error: "Partner record not found." }, { status: 404 })
    }

    if (partner.contractStatus === "not_sent") {
      return redirectToProfile(request, { contract: "not-sent" })
    }

    if (partner.contractStatus === "signed" || partner.contractSignedAt) {
      return redirectToProfile(request, { contract: "signed" })
    }

    const missingAgreementFields = getMissingAgreementFields({
      type: partner.type as "referral" | "channel",
      companyName: partner.companyName,
      contactName: partner.contactName,
      email: partner.email,
      designation: partner.designation,
      partnerAddress: partner.partnerAddress,
      emirateIdPassport: partner.emirateIdPassport,
      tradeLicense: partner.tradeLicense,
      beneficiaryName: partner.beneficiaryName,
      bankName: partner.bankName,
      bankCountry: partner.bankCountry,
      accountNoIban: partner.accountNoIban,
      swiftBicCode: partner.swiftBicCode,
      contractSentAt: partner.contractSentAt,
    })

    if (missingAgreementFields.length > 0) {
      return redirectToProfile(request, {
        contract: "missing-fields",
        reason: `Complete the missing contract details in your profile before signing: ${missingAgreementFields.map((field) => field.label).join(", ")}.`,
      })
    }

    const form = await request.formData()
    const signedName = String(form.get("signedName") || "").trim()
    const signedDesignationInput = String(form.get("signedDesignation") || "").trim()
    const signatureTypeValue = String(form.get("signatureType") || "typed").trim()
    const confirmation = String(form.get("confirm") || "")

    if (!signedName) {
      return redirectToProfile(request, {
        contract: "unavailable",
        reason: "Enter the authorised signatory name before signing the agreement.",
      })
    }

    if (confirmation !== "yes") {
      return redirectToProfile(request, {
        contract: "unavailable",
        reason: "Confirm that you reviewed the agreement before signing.",
      })
    }

    if (signatureTypeValue !== "typed" && signatureTypeValue !== "upload") {
      return redirectToProfile(request, {
        contract: "unavailable",
        reason: "Choose a valid signature method.",
      })
    }

    let signatureImageBytes: Buffer | null = null
    let signatureImageMimeType: string | null = null
    let signatureDataUrl: string | null = null

    if (signatureTypeValue === "upload") {
      const signatureFile = form.get("signatureFile")

      if (!(signatureFile instanceof File) || signatureFile.size === 0) {
        return redirectToProfile(request, {
          contract: "unavailable",
          reason: "Upload a PNG or JPEG signature image to sign the agreement.",
        })
      }

      if (!["image/png", "image/jpeg"].includes(signatureFile.type)) {
        return redirectToProfile(request, {
          contract: "unavailable",
          reason: "Signature uploads must be PNG or JPEG images.",
        })
      }

      if (signatureFile.size > 3 * 1024 * 1024) {
        return redirectToProfile(request, {
          contract: "unavailable",
          reason: "Signature image must be smaller than 3 MB.",
        })
      }

      signatureImageBytes = Buffer.from(await signatureFile.arrayBuffer())
      signatureImageMimeType = signatureFile.type
      signatureDataUrl = toDataUrl(signatureFile.type, signatureImageBytes)
    }

    const signedAt = new Date()
    const signedDesignation = signedDesignationInput || partner.designation || null
    const signedPdf = await createSignedAgreementPdf({
      agreementFilePath: getAgreementFilePath(partner.type as "referral" | "channel"),
      agreementTitle: getAgreementTitle(partner.type as "referral" | "channel"),
      partnerCompanyName: partner.companyName,
      partnerTypeLabel:
        partner.type === "channel" ? "Channel Partner" : "Referral Partner",
      partner: {
        type: partner.type as "referral" | "channel",
        companyName: partner.companyName,
        contactName: partner.contactName,
        email: partner.email,
        designation: partner.designation,
        partnerAddress: partner.partnerAddress,
        emirateIdPassport: partner.emirateIdPassport,
        tradeLicense: partner.tradeLicense,
        beneficiaryName: partner.beneficiaryName,
        bankName: partner.bankName,
        bankCountry: partner.bankCountry,
        accountNoIban: partner.accountNoIban,
        swiftBicCode: partner.swiftBicCode,
        contractSentAt: partner.contractSentAt,
      },
      signerName: signedName,
      signerDesignation: signedDesignation,
      signerEmail: partner.email,
      signatureType: signatureTypeValue,
      signedAt,
      signatureImageBytes,
      signatureImageMimeType,
    })

    const fileName = `${slugify(partner.companyName) || "partner"}-signed-agreement.pdf`

    const [existingSignedAgreement] = await db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.ownerType, "partner"),
          eq(documents.ownerId, partner.id),
          eq(documents.documentType, "signed_agreement_pdf")
        )
      )
      .orderBy(desc(documents.uploadedAt))
      .limit(1)

    if (existingSignedAgreement) {
      await db
        .update(documents)
        .set({
          fileName,
          zohoWorkdriveId: `in-app:${partner.id}:signed_agreement`,
          zohoWorkdriveUrl: `db://documents/${partner.id}/signed-agreement`,
          storageProvider: "database",
          mimeType: "application/pdf",
          fileDataBase64: signedPdf.toString("base64"),
          uploadedBy: userId,
          uploadedAt: signedAt,
        })
        .where(eq(documents.id, existingSignedAgreement.id))
    } else {
      await db.insert(documents).values({
        tenantId: partner.tenantId,
        ownerType: "partner",
        ownerId: partner.id,
        documentType: "signed_agreement_pdf",
        fileName,
        zohoWorkdriveId: `in-app:${partner.id}:signed_agreement`,
        zohoWorkdriveUrl: `db://documents/${partner.id}/signed-agreement`,
        storageProvider: "database",
        mimeType: "application/pdf",
        fileDataBase64: signedPdf.toString("base64"),
        uploadedBy: userId,
      })
    }

    const [updatedPartner] = await db
      .update(partners)
      .set({
        contractStatus: "signed",
        contractSignedAt: signedAt,
        contractSignedName: signedName,
        contractSignedDesignation: signedDesignation,
        contractSignatureType: signatureTypeValue,
        contractSignatureDataUrl: signatureDataUrl,
        agreementUrl: "/dashboard/profile",
        zohoSignRequestId: null,
        updatedAt: signedAt,
      })
      .where(eq(partners.id, partner.id))
      .returning()

    const actorName =
      [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
      user?.email ||
      partner.contactName

    await logActivity({
      tenantId: partner.tenantId,
      entityType: "partner",
      entityId: partner.id,
      actorId: userId,
      actorName,
      action: "partner.contract.signed",
      note: "Partner completed the agreement inside the portal. The signed PDF is stored in the workspace.",
      metadata: {
        signatureType: signatureTypeValue,
        signedName,
        signedDesignation: signedDesignation || null,
        signedAt: signedAt.toISOString(),
        partnerEmail: partner.email,
      },
    })

    if (!updatedPartner) {
      return redirectToProfile(request, {
        contract: "unavailable",
        reason: "The agreement was signed, but the partner record could not be updated.",
      })
    }

    return redirectToProfile(request, { contract: "signed" })
  } catch (error) {
    console.error("[POST /api/profile/contract] Error:", error)
    return redirectToProfile(request, {
      contract: "unavailable",
      reason: "The agreement could not be signed. Please try again.",
    })
  }
}
