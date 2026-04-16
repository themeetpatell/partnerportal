import { auth, currentUser } from "@repo/auth/server"
import { NextRequest, NextResponse } from "next/server"
import { and, desc, eq } from "drizzle-orm"
import { db, documents } from "@repo/db"
import {
  createPrefilledAgreementPdf,
  createSignedAgreementPdf,
  getAgreementFilePath,
  getAgreementTitle,
} from "@/lib/signed-agreement"
import { getPartnerRecordForAuthenticatedUser } from "@/lib/partner-record"

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function buildAgreementFileName(companyName: string, suffix: string) {
  return `${slugify(companyName) || "partner"}-${suffix}.pdf`
}

function getDisposition(searchParams: URLSearchParams) {
  return searchParams.get("disposition") === "inline" ? "inline" : "attachment"
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

async function upsertSignedAgreementDocument(params: {
  documentId?: string
  tenantId: string
  partnerId: string
  userId: string
  companyName: string
  pdfBytes: Buffer
}) {
  const fileName = buildAgreementFileName(params.companyName, "signed-agreement")
  const values = {
    fileName,
    zohoWorkdriveId: `in-app:${params.partnerId}:signed_agreement`,
    zohoWorkdriveUrl: `db://documents/${params.partnerId}/signed-agreement`,
    storageProvider: "database" as const,
    mimeType: "application/pdf",
    fileDataBase64: params.pdfBytes.toString("base64"),
    uploadedBy: params.userId,
    uploadedAt: new Date(),
  }

  if (params.documentId) {
    await db.update(documents).set(values).where(eq(documents.id, params.documentId))
    return fileName
  }

  await db.insert(documents).values({
    tenantId: params.tenantId,
    ownerType: "partner",
    ownerId: params.partnerId,
    documentType: "signed_agreement_pdf",
    ...values,
  })

  return fileName
}

export async function GET(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const user = await currentUser()
  const partner = await getPartnerRecordForAuthenticatedUser({
    userId,
    email: user?.email,
  })

  if (!partner) {
    return NextResponse.json({ error: "Partner record not found." }, { status: 404 })
  }

  const disposition = getDisposition(request.nextUrl.searchParams)

  const [document] = await db
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

  const agreementInput = {
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
      contractSentAt: partner.contractSentAt ?? partner.contractSignedAt ?? partner.createdAt,
    },
  }

  if (partner.contractStatus === "signed" || partner.contractSignedAt) {
    const parsedSignature = parseSignatureDataUrl(partner.contractSignatureDataUrl)
    const signatureType =
      parsedSignature &&
      (partner.contractSignatureType === "upload" || partner.contractSignatureType === "drawn")
        ? "upload"
        : "typed"

    const pdfBytes = await createSignedAgreementPdf({
      ...agreementInput,
      signerName: partner.contractSignedName || partner.contactName,
      signerDesignation: partner.contractSignedDesignation || partner.designation,
      signerEmail: partner.email,
      signatureType,
      signedAt: partner.contractSignedAt ? new Date(partner.contractSignedAt) : new Date(),
      signatureImageBytes: parsedSignature?.bytes ?? null,
      signatureImageMimeType: parsedSignature?.mimeType ?? null,
    })

    const fileName = await upsertSignedAgreementDocument({
      documentId:
        document?.documentType === "signed_agreement_pdf" ? document.id : undefined,
      tenantId: partner.tenantId,
      partnerId: partner.id,
      userId,
      companyName: partner.companyName,
      pdfBytes,
    })

    return new NextResponse(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${disposition}; filename="${fileName}"`,
      },
    })
  }

  const pdfBytes = await createPrefilledAgreementPdf({
    ...agreementInput,
    generatedAt: new Date(),
  })

  return new NextResponse(pdfBytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="${buildAgreementFileName(partner.companyName, "agreement-preview")}"`,
    },
  })
}
