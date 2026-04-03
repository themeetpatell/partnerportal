import { and, desc, eq } from "drizzle-orm"
import {
  createZohoSignEmbedUrl,
  createZohoSignRequest,
  downloadZohoSignCompletionCertificate,
  downloadZohoSignRequestPdf,
  getZohoSignRequest,
  submitZohoSignRequest,
} from "@repo/zoho"
import { db, documents, logActivity, partners } from "@repo/db"
import {
  createExternalAgreementPdf,
  getAgreementFilePath,
  getAgreementTitle,
  getMissingAgreementFields,
} from "@/lib/signed-agreement"

type PartnerRecord = typeof partners.$inferSelect

type ZohoContractSyncResult =
  | {
      partner: PartnerRecord
      requestStatus: string | null
      completed: false
    }
  | {
      partner: PartnerRecord
      requestStatus: string | null
      completed: true
    }

type ZohoContractRequestResult =
  | {
      error: string
      missingFields: ReturnType<typeof getMissingAgreementFields>
    }
  | {
      partner: PartnerRecord
      requestId: string | null
      completed: true
    }
  | {
      partner: PartnerRecord
      requestId: string
      completed: false
    }

type ZohoContractSigningUrlResult =
  | {
      error: string
      missingFields: ReturnType<typeof getMissingAgreementFields>
    }
  | {
      partner: PartnerRecord
      completed: true
    }
  | {
      partner: PartnerRecord
      signUrl: string
      completed: false
    }

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function getPartnerAppUrl() {
  return process.env.NEXT_PUBLIC_PARTNER_APP_URL?.trim() || "http://localhost:3000"
}

function getContractStartUrl() {
  return `${getPartnerAppUrl()}/api/profile/contract/start-sign`
}

function getContractCallbackUrl(state: string) {
  return `${getPartnerAppUrl()}/api/profile/contract/callback?state=${encodeURIComponent(state)}`
}

function getAgreementData(partner: PartnerRecord) {
  return {
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
  }
}

function normalizeZohoSignStatus(status: string | null | undefined) {
  return status?.trim().toLowerCase().replace(/[\s_-]+/g, "_") || ""
}

function findSignerAction(request: Awaited<ReturnType<typeof getZohoSignRequest>>, partner: PartnerRecord) {
  return (
    request.actions?.find(
      (action) =>
        action.recipient_email?.trim().toLowerCase() === partner.email.trim().toLowerCase()
    ) ||
    request.actions?.[0] ||
    null
  )
}

async function storeSignedDocuments(params: {
  partner: PartnerRecord
  requestId: string
  requestName: string
}) {
  const signedPdf = await downloadZohoSignRequestPdf(params.requestId)
  const completionCertificate = await downloadZohoSignCompletionCertificate(params.requestId)
  const companySlug = slugify(params.partner.companyName) || "partner"

  const [existingSignedAgreement] = await db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.ownerType, "partner"),
        eq(documents.ownerId, params.partner.id),
        eq(documents.documentType, "signed_agreement_pdf")
      )
    )
    .orderBy(desc(documents.uploadedAt))
    .limit(1)

  if (!existingSignedAgreement) {
    await db.insert(documents).values({
      tenantId: params.partner.tenantId,
      ownerType: "partner",
      ownerId: params.partner.id,
      documentType: "signed_agreement_pdf",
      fileName: `${companySlug}-signed-agreement.pdf`,
      zohoWorkdriveId: `zoho-sign:${params.requestId}:signed_pdf`,
      zohoWorkdriveUrl: `db://documents/${params.partner.id}/signed-agreement`,
      storageProvider: "database",
      mimeType: "application/pdf",
      fileDataBase64: signedPdf.toString("base64"),
      uploadedBy: params.partner.authUserId,
    })
  }

  const [existingCertificate] = await db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.ownerType, "partner"),
        eq(documents.ownerId, params.partner.id),
        eq(documents.documentType, "signed_agreement_completion_certificate_pdf")
      )
    )
    .orderBy(desc(documents.uploadedAt))
    .limit(1)

  if (!existingCertificate) {
    await db.insert(documents).values({
      tenantId: params.partner.tenantId,
      ownerType: "partner",
      ownerId: params.partner.id,
      documentType: "signed_agreement_completion_certificate_pdf",
      fileName: `${companySlug}-agreement-completion-certificate.pdf`,
      zohoWorkdriveId: `zoho-sign:${params.requestId}:completion_certificate`,
      zohoWorkdriveUrl: `db://documents/${params.partner.id}/agreement-completion-certificate`,
      storageProvider: "database",
      mimeType: "application/pdf",
      fileDataBase64: completionCertificate.toString("base64"),
      uploadedBy: params.partner.authUserId,
    })
  }
}

export async function syncZohoSignedContract(
  partner: PartnerRecord
): Promise<ZohoContractSyncResult> {
  if (!partner.zohoSignRequestId) {
    return {
      partner,
      requestStatus: null,
      completed: false,
    }
  }

  const request = await getZohoSignRequest(partner.zohoSignRequestId)
  const requestStatus = normalizeZohoSignStatus(request.request_status)

  if (!["completed", "signed", "executed"].includes(requestStatus)) {
    return {
      partner,
      requestStatus,
      completed: false,
    }
  }

  if (partner.contractSignedAt) {
    return {
      partner,
      requestStatus,
      completed: true,
    }
  }

  const signerAction = findSignerAction(request, partner)
  const completedAtRaw =
    signerAction?.action_completed_time ||
    signerAction?.completed_time ||
    Date.now()
  const completedAt = new Date(completedAtRaw)
  const now = new Date()

  await storeSignedDocuments({
    partner,
    requestId: request.request_id,
    requestName: request.request_name || getAgreementTitle(partner.type as "referral" | "channel"),
  })

  const [updatedPartner] = await db
    .update(partners)
    .set({
      contractStatus: "signed",
      contractSignedAt: completedAt,
      contractSignedName: signerAction?.recipient_name || partner.contactName,
      contractSignedDesignation: partner.designation || null,
      contractSignatureType: "zoho_sign",
      contractSignatureDataUrl: null,
      updatedAt: now,
    })
    .where(eq(partners.id, partner.id))
    .returning()

  await logActivity({
    tenantId: partner.tenantId,
    entityType: "partner",
    entityId: partner.id,
    actorId: partner.authUserId,
    actorName: signerAction?.recipient_name || partner.contactName,
    action: "partner.contract.signed",
    note: "Partner completed the agreement in Zoho Sign. Signed files were synced back into the portal.",
  })

  return {
    partner: updatedPartner,
    requestStatus,
    completed: true,
  }
}

export async function ensureZohoContractRequest(
  partner: PartnerRecord
): Promise<ZohoContractRequestResult> {
  const agreementData = getAgreementData(partner)
  const missingAgreementFields = getMissingAgreementFields(agreementData)

  if (missingAgreementFields.length > 0) {
    return {
      error: `Complete the missing contract details in your profile before signing: ${missingAgreementFields
        .map((field) => field.label)
        .join(", ")}.`,
      missingFields: missingAgreementFields,
    }
  }

  let existingSync: Awaited<ReturnType<typeof syncZohoSignedContract>>

  try {
    existingSync = await syncZohoSignedContract(partner)
  } catch (error) {
    if (partner.zohoSignRequestId) {
      const [clearedPartner] = await db
        .update(partners)
        .set({
          zohoSignRequestId: null,
          updatedAt: new Date(),
        })
        .where(eq(partners.id, partner.id))
        .returning()

      existingSync = {
        partner: clearedPartner,
        requestStatus: "stale_request",
        completed: false,
      }
    } else {
      throw error
    }
  }

  if (existingSync.completed || existingSync.partner.contractSignedAt) {
    return {
      partner: existingSync.partner,
      requestId: existingSync.partner.zohoSignRequestId,
      completed: true,
    }
  }

  if (
    ["declined", "expired", "voided", "cancelled", "recalled", "stale_request"].includes(
      existingSync.requestStatus || ""
    )
  ) {
    const [resetPartner] = await db
      .update(partners)
      .set({
        zohoSignRequestId: null,
        updatedAt: new Date(),
      })
      .where(eq(partners.id, existingSync.partner.id))
      .returning()

    existingSync = {
      partner: resetPartner,
      requestStatus: null,
      completed: false,
    }
  }

  if (existingSync.partner.zohoSignRequestId) {
    return {
      partner: existingSync.partner,
      requestId: existingSync.partner.zohoSignRequestId,
      completed: false,
    }
  }

  const agreementTitle = getAgreementTitle(partner.type as "referral" | "channel")
  const { pdfBytes, signaturePlacement } = await createExternalAgreementPdf({
    agreementFilePath: getAgreementFilePath(partner.type as "referral" | "channel"),
    agreementTitle,
    partnerCompanyName: partner.companyName,
    partnerTypeLabel: partner.type === "channel" ? "Channel Partner" : "Referral Partner",
    generatedAt: new Date(),
    partner: agreementData,
  })

  const request = await createZohoSignRequest({
    requestName: `${partner.companyName} - ${agreementTitle}`,
    description: `Partner agreement for ${partner.companyName}`,
    recipientName: partner.contactName,
    recipientEmail: partner.email,
    fileName: `${slugify(partner.companyName) || "partner"}-agreement.pdf`,
    fileBytes: pdfBytes,
    notes: "Please review and sign this partner agreement.",
    redirectPages: {
      sign_success: getContractCallbackUrl("success"),
      sign_completed: getContractCallbackUrl("completed"),
      sign_declined: getContractCallbackUrl("declined"),
      sign_later: getContractCallbackUrl("later"),
    },
  })

  const signerAction = findSignerAction(request, partner)
  const documentId = request.document_ids?.[0]?.document_id

  if (!signerAction?.action_id || !documentId) {
    throw new Error("[zoho/sign] request created without signer action or document id")
  }

  await submitZohoSignRequest({
    requestId: request.request_id,
    actionId: signerAction.action_id,
    recipientName: partner.contactName,
    recipientEmail: partner.email,
    documentId,
    pageNo: signaturePlacement.pageNo,
    xCoord: signaturePlacement.xCoord,
    yCoord: signaturePlacement.yCoord,
    width: signaturePlacement.width,
    height: signaturePlacement.height,
  })

  const now = new Date()
  const [updatedPartner] = await db
    .update(partners)
    .set({
      zohoSignRequestId: request.request_id,
      agreementUrl: getContractStartUrl(),
      updatedAt: now,
    })
    .where(eq(partners.id, partner.id))
    .returning()

  await logActivity({
    tenantId: partner.tenantId,
    entityType: "partner",
    entityId: partner.id,
    actorId: partner.authUserId,
    actorName: partner.contactName,
    action: "partner.contract.requested",
    note: "Zoho Sign agreement request was created for external signing.",
  })

  return {
    partner: updatedPartner,
    requestId: request.request_id,
    completed: false,
  }
}

export async function createZohoContractSigningUrl(
  partner: PartnerRecord
): Promise<ZohoContractSigningUrlResult> {
  const result = await ensureZohoContractRequest(partner)

  if ("error" in result) {
    return result
  }

  if (result.completed || result.partner.contractSignedAt || !result.requestId) {
    return {
      partner: result.partner,
      completed: true,
    }
  }

  const request = await getZohoSignRequest(result.requestId)
  const signerAction = findSignerAction(request, result.partner)

  if (!signerAction?.action_id) {
    throw new Error("[zoho/sign] signer action not found for embedded signing")
  }

  const signUrl = await createZohoSignEmbedUrl({
    requestId: request.request_id,
    actionId: signerAction.action_id,
    host: getPartnerAppUrl(),
  })

  return {
    partner: result.partner,
    signUrl,
    completed: false,
  }
}
