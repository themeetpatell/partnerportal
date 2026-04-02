import { auth, currentUser } from "@repo/auth/server"
import { NextRequest, NextResponse } from "next/server"
import { db, documents, logActivity, partners } from "@repo/db"
import { eq } from "drizzle-orm"
import { rateLimit } from "@repo/auth"
import {
  createSignedAgreementPdf,
  getAgreementFilePath,
  getAgreementTitle,
  getMissingAgreementFields,
} from "@/lib/signed-agreement"

const MAX_SIGNATURE_FILE_SIZE = 2 * 1024 * 1024
const ALLOWED_SIGNATURE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"])

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const limited = rateLimit(`profile-contract:sign:${userId}`, 10, 60_000)
  if (limited) return limited

  const user = await currentUser()
  const form = await request.formData()

  const signedName = form.get("signedName")
  const signedDesignation = form.get("signedDesignation")
  const signatureType = form.get("signatureType")
  const confirm = form.get("confirm")
  const signatureFile = form.get("signatureFile")

  if (typeof signedName !== "string" || !signedName.trim()) {
    return NextResponse.json({ error: "Full legal name is required." }, { status: 400 })
  }

  if (confirm !== "yes") {
    return NextResponse.json({ error: "Confirmation is required." }, { status: 400 })
  }

  if (signatureType !== "typed" && signatureType !== "upload") {
    return NextResponse.json({ error: "Invalid signature type." }, { status: 400 })
  }

  const [partner] = await db
    .select()
    .from(partners)
    .where(eq(partners.authUserId, userId))
    .limit(1)

  if (!partner) {
    return NextResponse.json({ error: "Partner record not found." }, { status: 404 })
  }

  if (!partner.agreementUrl || partner.contractStatus !== "sent") {
    return NextResponse.json(
      { error: "No agreement is available for signing yet." },
      { status: 400 }
    )
  }

  if (partner.contractSignedAt) {
    return NextResponse.json(
      { error: "This agreement has already been signed." },
      { status: 400 }
    )
  }

  const missingAgreementFields = getMissingAgreementFields({
    type: partner.type as "referral" | "channel",
    companyName: partner.companyName,
    contactName: partner.contactName,
    email: partner.email,
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
    return NextResponse.json(
      {
        error: `Complete the missing contract details in your profile before signing: ${missingAgreementFields
          .map((field) => field.label)
          .join(", ")}.`,
      },
      { status: 400 }
    )
  }

  let signatureDataUrl: string | null = null
  let signatureImageBytes: Uint8Array | null = null
  let signatureImageMimeType: string | null = null

  if (signatureType === "upload") {
    if (!(signatureFile instanceof File) || signatureFile.size === 0) {
      return NextResponse.json(
        { error: "Upload a signature image to continue." },
        { status: 400 }
      )
    }

    if (!ALLOWED_SIGNATURE_TYPES.has(signatureFile.type)) {
      return NextResponse.json(
        { error: "Signature image must be PNG, JPG, or WEBP." },
        { status: 400 }
      )
    }

    if (signatureFile.size > MAX_SIGNATURE_FILE_SIZE) {
      return NextResponse.json(
        { error: "Signature image must be 2 MB or smaller." },
        { status: 400 }
      )
    }

    const bytes = Buffer.from(await signatureFile.arrayBuffer())
    signatureImageBytes = Uint8Array.from(bytes)
    signatureImageMimeType = signatureFile.type
    signatureDataUrl = `data:${signatureFile.type};base64,${bytes.toString("base64")}`
  }

  const now = new Date()
  const agreementTitle = getAgreementTitle(partner.type as "referral" | "channel")
  const pdfBytes = await createSignedAgreementPdf({
    agreementFilePath: getAgreementFilePath(partner.type as "referral" | "channel"),
    agreementTitle,
    partnerCompanyName: partner.companyName,
    partnerTypeLabel:
      partner.type === "channel" ? "Channel Partner" : "Referral Partner",
    partner: {
      type: partner.type as "referral" | "channel",
      companyName: partner.companyName,
      contactName: partner.contactName,
      email: partner.email,
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
    signerName: signedName.trim(),
    signerDesignation:
      typeof signedDesignation === "string" && signedDesignation.trim()
        ? signedDesignation.trim()
        : null,
    signerEmail: partner.email,
    signatureType,
    signedAt: now,
    signatureImageBytes,
    signatureImageMimeType,
  })

  const signedFileName = `${partner.companyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "partner"}-signed-agreement.pdf`

  await db
    .update(partners)
    .set({
      contractStatus: "signed",
      contractSignedAt: now,
      contractSignedName: signedName.trim(),
      contractSignedDesignation:
        typeof signedDesignation === "string" && signedDesignation.trim()
          ? signedDesignation.trim()
          : null,
      contractSignatureType: signatureType,
      contractSignatureDataUrl: signatureDataUrl,
      updatedAt: now,
    })
    .where(eq(partners.id, partner.id))

  await db.insert(documents).values({
    tenantId: partner.tenantId,
    ownerType: "partner",
    ownerId: partner.id,
    documentType: "signed_agreement_pdf",
    fileName: signedFileName,
    zohoWorkdriveId: `db:${partner.id}:signed_agreement_pdf`,
    zohoWorkdriveUrl: `db://documents/${partner.id}/signed-agreement`,
    storageProvider: "database",
    mimeType: "application/pdf",
    fileDataBase64: Buffer.from(pdfBytes).toString("base64"),
    uploadedBy: userId,
  })

  await logActivity({
    tenantId: partner.tenantId,
    entityType: "partner",
    entityId: partner.id,
    actorId: userId,
    actorName:
      [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
      user?.email ||
      partner.contactName,
    action: "updated",
    note:
      signatureType === "upload"
        ? "Partner signed the agreement in the portal using an uploaded signature image."
        : "Partner signed the agreement in the portal using a typed digital signature.",
  })

  return NextResponse.redirect(new URL("/dashboard/profile?contract=signed", request.url))
}
