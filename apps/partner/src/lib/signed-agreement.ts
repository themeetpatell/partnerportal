import path from "node:path"
import mammoth from "mammoth"
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
} from "pdf-lib"

export type AgreementType = "referral" | "channel"

type AgreementSection = "secondary" | "financial"

type AgreementRequiredField = {
  key:
    | "partnerAddress"
    | "emirateIdPassport"
    | "tradeLicense"
    | "beneficiaryName"
    | "bankName"
    | "accountNoIban"
    | "swiftBicCode"
  label: string
  section: AgreementSection
}

export type AgreementMissingField = AgreementRequiredField

export type AgreementPartnerData = {
  type: AgreementType
  companyName: string
  contactName: string
  email: string
  partnerAddress?: string | null
  emirateIdPassport?: string | null
  tradeLicense?: string | null
  beneficiaryName?: string | null
  bankName?: string | null
  bankCountry?: string | null
  accountNoIban?: string | null
  swiftBicCode?: string | null
  contractSentAt?: Date | string | null
}

type AgreementPdfBaseInput = {
  agreementFilePath: string
  agreementTitle: string
  partnerCompanyName: string
  partnerTypeLabel: string
  partner: AgreementPartnerData
}

type CreateSignedAgreementPdfInput = AgreementPdfBaseInput & {
  signerName: string
  signerDesignation?: string | null
  signerEmail: string
  signatureType: "typed" | "upload"
  signedAt: Date
  signatureImageBytes?: Uint8Array | null
  signatureImageMimeType?: string | null
}

type CreatePrefilledAgreementPdfInput = AgreementPdfBaseInput & {
  generatedAt?: Date
}

const PAGE_SIZE = { width: 595, height: 842 }
const MARGIN_X = 50
const TOP_Y = 792
const BOTTOM_Y = 55
const BODY_FONT_SIZE = 10
const LINE_HEIGHT = 14

const REQUIRED_FIELDS: Record<AgreementType, AgreementRequiredField[]> = {
  referral: [
    { key: "partnerAddress", label: "Registered address", section: "secondary" },
    { key: "emirateIdPassport", label: "EID / passport / national ID", section: "financial" },
    { key: "beneficiaryName", label: "Bank account name", section: "financial" },
    { key: "bankName", label: "Bank name", section: "financial" },
    { key: "accountNoIban", label: "Bank account number / IBAN", section: "financial" },
    { key: "swiftBicCode", label: "SWIFT / BIC code", section: "financial" },
  ],
  channel: [
    { key: "partnerAddress", label: "Registered address", section: "secondary" },
    { key: "tradeLicense", label: "Trade license number", section: "financial" },
    { key: "beneficiaryName", label: "Bank account name", section: "financial" },
    { key: "bankName", label: "Bank name", section: "financial" },
    { key: "accountNoIban", label: "Bank account number / IBAN", section: "financial" },
    { key: "swiftBicCode", label: "SWIFT / BIC code", section: "financial" },
  ],
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ""

  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    const width = font.widthOfTextAtSize(next, size)
    if (width <= maxWidth) {
      current = next
      continue
    }

    if (current) {
      lines.push(current)
    }
    current = word
  }

  if (current) {
    lines.push(current)
  }

  return lines
}

function normaliseAgreementText(rawText: string) {
  return rawText
    .replace(/\u0007/g, " ")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function addNewPage(pdf: PDFDocument) {
  return pdf.addPage([PAGE_SIZE.width, PAGE_SIZE.height])
}

async function extractAgreementText(agreementFilePath: string) {
  const result = await mammoth.extractRawText({ path: agreementFilePath })
  return normaliseAgreementText(result.value)
}

function normaliseFieldValue(value: string | null | undefined) {
  if (typeof value !== "string") {
    return ""
  }

  return value.trim()
}

function presentFieldValue(value: string | null | undefined) {
  const normalised = normaliseFieldValue(value)
  return normalised || "Missing in profile"
}

function formatAgreementDate(value: Date | string | null | undefined) {
  const date = value ? new Date(value) : new Date()
  return date.toLocaleDateString("en-AE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function applyTextReplacements(
  text: string,
  replacements: Array<{ pattern: RegExp; value: string }>
) {
  let output = text

  for (const replacement of replacements) {
    output = output.replace(replacement.pattern, () => replacement.value)
  }

  return output
}

function getBankNameLine(partner: AgreementPartnerData) {
  const bankName = normaliseFieldValue(partner.bankName)
  const bankCountry = normaliseFieldValue(partner.bankCountry)

  if (bankName && bankCountry) {
    return `${bankName} (${bankCountry})`
  }

  return bankName || bankCountry || "Missing in profile"
}

function getChannelLicensingAuthority(partner: AgreementPartnerData) {
  return normaliseFieldValue(partner.tradeLicense)
    ? "As per the submitted trade license"
    : "Missing in profile"
}

async function buildPrefilledAgreementText(
  agreementFilePath: string,
  partner: AgreementPartnerData
) {
  const rawText = await extractAgreementText(agreementFilePath)
  const effectiveDate = formatAgreementDate(partner.contractSentAt)

  if (partner.type === "channel") {
    return applyTextReplacements(rawText, [
      {
        pattern: /1\. Effective Date:\s*_{3,}/,
        value: `1. Effective Date: ${effectiveDate}`,
      },
      {
        pattern: /- Company Name:\s*_{3,}/,
        value: `- Company Name: ${presentFieldValue(partner.companyName)}`,
      },
      {
        pattern: /- Licensing Authority:\s*_{3,}/,
        value: `- Licensing Authority: ${getChannelLicensingAuthority(partner)}`,
      },
      {
        pattern: /- Trade License Number:\s*_{3,}/,
        value: `- Trade License Number: ${presentFieldValue(partner.tradeLicense)}`,
      },
      {
        pattern: /- Registered Address:\s*_{3,}/,
        value: `- Registered Address: ${presentFieldValue(partner.partnerAddress)}`,
      },
      {
        pattern: /- Bank Account Name:\s*_{3,}/,
        value: `- Bank Account Name: ${presentFieldValue(partner.beneficiaryName)}`,
      },
      {
        pattern: /- Bank Account Number \/ IBAN:\s*_{3,}/,
        value: `- Bank Account Number / IBAN: ${presentFieldValue(partner.accountNoIban)}`,
      },
      {
        pattern: /- Bank Name:\s*_{3,}/,
        value: `- Bank Name: ${getBankNameLine(partner)}`,
      },
      {
        pattern: /- SWIFT Code \(if applicable\):\s*_{3,}/,
        value: `- SWIFT Code (if applicable): ${presentFieldValue(partner.swiftBicCode)}`,
      },
    ])
  }

  return applyTextReplacements(rawText, [
    {
      pattern: /1\. Effective Date:\s*_{3,}/,
      value: `1. Effective Date: ${effectiveDate}`,
    },
    {
      pattern: /- Name:\s*_{3,}/,
      value: `- Name: ${presentFieldValue(partner.contactName)}`,
    },
    {
      pattern: /- EID \/ Passport \/ National ID:\s*_{3,}/,
      value: `- EID / Passport / National ID: ${presentFieldValue(partner.emirateIdPassport)}`,
    },
    {
      pattern: /- Registered Address:\s*_{3,}/,
      value: `- Registered Address: ${presentFieldValue(partner.partnerAddress)}`,
    },
    {
      pattern: /- Bank Account Name:\s*_{3,}/,
      value: `- Bank Account Name: ${presentFieldValue(partner.beneficiaryName)}`,
    },
    {
      pattern: /- Bank Account Number \/ IBAN:\s*_{3,}/,
      value: `- Bank Account Number / IBAN: ${presentFieldValue(partner.accountNoIban)}`,
    },
    {
      pattern: /- Bank Name & Branch:\s*_{3,}/,
      value: `- Bank Name & Branch: ${getBankNameLine(partner)}`,
    },
    {
      pattern: /- SWIFT Code \(if applicable\):\s*_{3,}/,
      value: `- SWIFT Code (if applicable): ${presentFieldValue(partner.swiftBicCode)}`,
    },
  ])
}

function drawAgreementBody(
  pdf: PDFDocument,
  text: string,
  bodyFont: PDFFont,
  headingFont: PDFFont,
  initialPage: ReturnType<typeof addNewPage>,
  initialY: number
) {
  let page = initialPage
  let y = initialY
  const paragraphs = text
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
  const maxWidth = PAGE_SIZE.width - MARGIN_X * 2

  page.drawText("Agreement Text", {
    x: MARGIN_X,
    y,
    size: 13,
    font: headingFont,
    color: rgb(0.09, 0.11, 0.15),
  })
  y -= 22

  for (const paragraph of paragraphs) {
    const lines = wrapText(
      paragraph.replace(/\n/g, " "),
      bodyFont,
      BODY_FONT_SIZE,
      maxWidth
    )

    for (const line of lines) {
      if (y < BOTTOM_Y) {
        page = addNewPage(pdf)
        y = TOP_Y
      }

      page.drawText(line, {
        x: MARGIN_X,
        y,
        size: BODY_FONT_SIZE,
        font: bodyFont,
        color: rgb(0.12, 0.14, 0.18),
      })
      y -= LINE_HEIGHT
    }

    y -= 8
  }
}

export function getMissingAgreementFields(partner: AgreementPartnerData) {
  return REQUIRED_FIELDS[partner.type].filter((field) => {
    const value = partner[field.key]
    return !normaliseFieldValue(typeof value === "string" ? value : null)
  })
}

export async function createPrefilledAgreementPdf(
  input: CreatePrefilledAgreementPdfInput
) {
  const pdf = await PDFDocument.create()
  const headingFont = await pdf.embedFont(StandardFonts.HelveticaBold)
  const bodyFont = await pdf.embedFont(StandardFonts.Helvetica)
  const agreementText = await buildPrefilledAgreementText(
    input.agreementFilePath,
    input.partner
  )

  const page = addNewPage(pdf)
  let y = TOP_Y

  page.drawText("Partner Agreement Preview", {
    x: MARGIN_X,
    y,
    size: 22,
    font: headingFont,
    color: rgb(0.09, 0.11, 0.15),
  })
  y -= 30

  const headerLines = [
    `Agreement: ${input.agreementTitle}`,
    `Partner company: ${input.partnerCompanyName}`,
    `Partner type: ${input.partnerTypeLabel}`,
    `Generated from profile: ${(input.generatedAt ?? new Date()).toLocaleString("en-AE", {
      dateStyle: "long",
      timeStyle: "short",
    })}`,
    "Update your profile before signing if any particulars need correction.",
  ]

  for (const line of headerLines) {
    page.drawText(line, {
      x: MARGIN_X,
      y,
      size: 11,
      font: bodyFont,
      color: rgb(0.22, 0.24, 0.28),
    })
    y -= 16
  }

  y -= 6
  page.drawLine({
    start: { x: MARGIN_X, y },
    end: { x: PAGE_SIZE.width - MARGIN_X, y },
    thickness: 1,
    color: rgb(0.82, 0.84, 0.88),
  })
  y -= 26

  drawAgreementBody(pdf, agreementText, bodyFont, headingFont, page, y)

  const bytes = await pdf.save()
  return Buffer.from(bytes)
}

export async function createSignedAgreementPdf(
  input: CreateSignedAgreementPdfInput
) {
  const pdf = await PDFDocument.create()
  const headingFont = await pdf.embedFont(StandardFonts.HelveticaBold)
  const bodyFont = await pdf.embedFont(StandardFonts.Helvetica)
  const agreementText = await buildPrefilledAgreementText(
    input.agreementFilePath,
    input.partner
  )

  const page = addNewPage(pdf)
  let y = TOP_Y

  page.drawText("Signed Partner Agreement", {
    x: MARGIN_X,
    y,
    size: 22,
    font: headingFont,
    color: rgb(0.09, 0.11, 0.15),
  })
  y -= 30

  const headerLines = [
    `Agreement: ${input.agreementTitle}`,
    `Partner company: ${input.partnerCompanyName}`,
    `Partner type: ${input.partnerTypeLabel}`,
    `Signed by: ${input.signerName}`,
    `Designation: ${input.signerDesignation || "Not provided"}`,
    `Email: ${input.signerEmail}`,
    `Signature method: ${input.signatureType === "upload" ? "Uploaded signature image" : "Typed digital signature"}`,
    `Signed at: ${input.signedAt.toLocaleString("en-AE", {
      dateStyle: "long",
      timeStyle: "short",
    })}`,
  ]

  for (const line of headerLines) {
    page.drawText(line, {
      x: MARGIN_X,
      y,
      size: 11,
      font: bodyFont,
      color: rgb(0.22, 0.24, 0.28),
    })
    y -= 16
  }

  y -= 6
  page.drawLine({
    start: { x: MARGIN_X, y },
    end: { x: PAGE_SIZE.width - MARGIN_X, y },
    thickness: 1,
    color: rgb(0.82, 0.84, 0.88),
  })
  y -= 26

  if (input.signatureType === "upload" && input.signatureImageBytes?.length) {
    let signatureImage
    if (input.signatureImageMimeType === "image/png") {
      signatureImage = await pdf.embedPng(input.signatureImageBytes)
    } else {
      signatureImage = await pdf.embedJpg(input.signatureImageBytes)
    }

    const width = 180
    const scale = width / signatureImage.width
    const height = signatureImage.height * scale

    page.drawText("Uploaded signature", {
      x: MARGIN_X,
      y,
      size: 10,
      font: headingFont,
      color: rgb(0.09, 0.11, 0.15),
    })
    y -= 18

    page.drawImage(signatureImage, {
      x: MARGIN_X,
      y: y - height,
      width,
      height,
    })

    y -= height + 22
  } else {
    page.drawText(`Digital signature: ${input.signerName}`, {
      x: MARGIN_X,
      y,
      size: 12,
      font: headingFont,
      color: rgb(0.09, 0.11, 0.15),
    })
    y -= 26
  }

  drawAgreementBody(pdf, agreementText, bodyFont, headingFont, page, y)

  const bytes = await pdf.save()
  return Buffer.from(bytes)
}

export function getAgreementTitle(type: AgreementType) {
  return type === "channel"
    ? "Channel Partner Agreement 2026 V1.2"
    : "Referral Partner Agreement 2026 V1.2"
}

export function getAgreementFilePath(type: AgreementType) {
  return path.join(
    process.cwd(),
    "public",
    "contracts",
    type === "channel"
      ? "channel-partner-agreement-2026-v1-2.docx"
      : "referral-partner-agreement-2026-v1-2.docx"
  )
}
