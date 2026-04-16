import path from "node:path"
import { readFile } from "node:fs/promises"
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
    | "designation"
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
  designation?: string | null
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

export type AgreementExternalSignaturePlacement = {
  pageNo: number
  xCoord: number
  yCoord: number
  width: number
  height: number
}

const PAGE_SIZE = { width: 595, height: 842 }
const MARGIN_X = 50
const TOP_Y = 792
const BOTTOM_Y = 55
const BODY_FONT_SIZE = 10
const LINE_HEIGHT = 14
const PAGE_INNER_WIDTH = PAGE_SIZE.width - MARGIN_X * 2
const FIRST_PARTY = {
  company: "Finanshels Accounting Technologies LLC",
  licensingAuthority: "Sharjah Media City (Shams) Free Zone",
  tradeLicenseNumber: "2221700.01",
  registeredAddress: "Sharjah Media City, Sharjah, UAE",
  signatory: "Muhammed Shafeeq",
  designation: "CEO",
}

const REQUIRED_FIELDS: Record<AgreementType, AgreementRequiredField[]> = {
  referral: [
    { key: "designation", label: "Job title / designation", section: "secondary" },
    { key: "partnerAddress", label: "Registered address", section: "secondary" },
    { key: "emirateIdPassport", label: "EID / passport / national ID", section: "financial" },
    { key: "beneficiaryName", label: "Bank account name", section: "financial" },
    { key: "bankName", label: "Bank name", section: "financial" },
    { key: "accountNoIban", label: "Bank account number / IBAN", section: "financial" },
    { key: "swiftBicCode", label: "SWIFT / BIC code", section: "financial" },
  ],
  channel: [
    { key: "designation", label: "Job title / designation", section: "secondary" },
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

function addNewPage(pdf: PDFDocument) {
  return pdf.addPage([PAGE_SIZE.width, PAGE_SIZE.height])
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

function getBankNameLine(partner: AgreementPartnerData) {
  const bankName = normaliseFieldValue(partner.bankName)
  const bankCountry = normaliseFieldValue(partner.bankCountry)

  if (bankName && bankCountry) {
    return `${bankName} (${bankCountry})`
  }

  return bankName || bankCountry || "Missing in profile"
}

function getPartnerLabel(type: AgreementType) {
  return type === "channel" ? "Channel Partner" : "Referral Partner"
}

function getAgreementSections(partnerType: AgreementType) {
  const partnerLabel = getPartnerLabel(partnerType)

  return [
    {
      title: "1. Purpose",
      clauses: [
        "The First Party agrees to provide the financial services listed in Annexure I, together with any approved related services communicated in writing.",
        `The ${partnerLabel} will introduce potential clients to the First Party for those services, and the applicable client engagement terms of Finanshels will govern the delivery of those services.`,
      ],
    },
    {
      title: "2. Relationship of Parties",
      clauses: [
        "Nothing in this Agreement creates any agency, partnership, joint venture, franchise, or employment relationship between the Parties.",
        "Neither Party is authorized to bind, represent, or create obligations on behalf of the other Party unless expressly approved in writing.",
      ],
    },
    {
      title: "3. Responsibilities of the Parties",
      clauses: [
        `The ${partnerLabel} will submit only legitimate referrals from prospects who have consented to be contacted and whose needs fit the First Party's services.`,
        "The First Party will manage qualification, commercials, onboarding, and delivery for any client accepted through the partnership.",
        "The First Party may share reasonable updates on referred opportunities, subject to confidentiality, compliance, and client-consent boundaries.",
        `The ${partnerLabel} may not make misleading statements about pricing, scope, timelines, licensing, or service outcomes.`,
      ],
    },
    {
      title: "4. Referral Fees and Payment Terms",
      clauses: [
        `The First Party will pay the ${partnerLabel} in accordance with Annexure II: ${partnerLabel} Commission Structure.`,
        "Eligible commissions are payable within thirty (30) days after the First Party receives cleared payment from the referred client, unless otherwise stated in writing.",
      ],
    },
    {
      title: "5. Renewal Commission Eligibility",
      clauses: [
        `Annual renewal commissions apply only while the ${partnerLabel} maintains active status.`,
        `If the ${partnerLabel} does not submit any qualified lead for ninety (90) consecutive days, the partner is considered to be in a Commercial Reset (Churn) period and renewal commissions stop during that period.`,
        `Renewal commissions resume only for client renewals occurring after the ${partnerLabel} regains active status by submitting a new qualified lead accepted by Finanshels.`,
      ],
    },
    {
      title: "6. Term and Termination",
      clauses: [
        "This Agreement starts on the Effective Date and remains in force for one (1) year, automatically renewing for successive one-year periods unless terminated by either Party on thirty (30) days written notice.",
        "Termination does not remove the obligation to pay valid commissions already earned under this Agreement.",
      ],
    },
    {
      title: "7. Confidentiality",
      clauses: [
        "Both Parties must maintain the confidentiality of client, pricing, commercial, and operational information exchanged under this Agreement, except where disclosure is required by law.",
      ],
    },
    {
      title: "8. Limitation of Liability and Indemnification",
      clauses: [
        "Neither Party is liable for indirect, incidental, special, or consequential damages arising from this Agreement.",
        "Each Party agrees to indemnify the other against direct claims, damages, and costs resulting from its own breach, misrepresentation, or unlawful conduct.",
        "For the avoidance of doubt, Finanshels' aggregate liability under this Agreement will not exceed the total commission payable to the Second Party under this Agreement.",
      ],
    },
    {
      title: "9. Non-Solicitation",
      clauses: [
        "During the term of this Agreement and for one (1) year after termination, neither Party may solicit or induce the other Party's clients to end or reduce their business relationship for competing services.",
        "During the same period, neither Party may solicit the other Party's employees or contractors away for competing activities.",
      ],
    },
    {
      title: "10. Dispute Resolution",
      clauses: [
        "The Parties will first attempt to resolve disputes through good-faith negotiations within thirty (30) days.",
        "If unresolved, the dispute will be settled by arbitration under the rules of the Dubai International Arbitration Centre (DIAC) in Dubai, UAE, in English.",
        "Either Party may seek interim or urgent relief from the courts of Dubai where necessary.",
      ],
    },
    {
      title: "11. Miscellaneous",
      clauses: [
        "Neither Party is liable for delay or failure in performance caused by events beyond its reasonable control, including natural disasters, government restrictions, or acts of God.",
        "This Agreement represents the complete understanding between the Parties and supersedes all prior discussions and understandings relating to the partnership.",
        "Any amendment to this Agreement must be in writing and signed by both Parties.",
      ],
    },
  ]
}

function getAgreementServiceList(type: AgreementType) {
  return type === "channel"
    ? [
        "Bookkeeping",
        "Tax Consultancy",
        "Audit Services",
        "Liquidation Services",
        "Financial Advisory Services",
        "AML Services",
        "Compliance Services",
      ]
    : [
        "Bookkeeping",
        "Tax Consultancy",
        "Audit Services",
        "Liquidation Services",
        "Financial Advisory Services",
      ]
}

function getAgreementCommissionStructure(type: AgreementType) {
  return type === "channel"
    ? {
        annual: "30% of first-year package",
        renewal: "20% of annual renewals",
        addon: "15% on add-on services",
        altRate: "50% of first payment only",
      }
    : {
        annual: "30% of first-year package",
        renewal: "20% of annual renewals",
        addon: "15% on add-on services",
        altRate: "30% of first payment only",
      }
}

async function buildPrefilledAgreementText(
  _agreementFilePath: string,
  partner: AgreementPartnerData
) {
  const partnerLabel = getPartnerLabel(partner.type)
  const sections = getAgreementSections(partner.type)
  const services = getAgreementServiceList(partner.type)
  const commission = getAgreementCommissionStructure(partner.type)
  const lines: string[] = [
    `Effective Date: ${formatAgreementDate(partner.contractSentAt)}`,
    "Jurisdiction: Dubai, UAE",
    "",
    "First Party",
    `- Company: ${FIRST_PARTY.company}`,
    `- Licensing Authority: ${FIRST_PARTY.licensingAuthority}`,
    `- Trade License Number: ${FIRST_PARTY.tradeLicenseNumber}`,
    `- Registered Address: ${FIRST_PARTY.registeredAddress}`,
    `- Signatory: ${FIRST_PARTY.signatory}, ${FIRST_PARTY.designation}`,
    "",
    "Second Party",
    `- Partner Type: ${partnerLabel}`,
    `- Company: ${presentFieldValue(partner.companyName)}`,
    `- Authorized Signatory: ${presentFieldValue(partner.contactName)}`,
    `- Email: ${presentFieldValue(partner.email)}`,
    `- Designation: ${presentFieldValue(partner.designation)}`,
    `- Registered Address: ${presentFieldValue(partner.partnerAddress)}`,
    `- Trade License / National ID: ${partner.type === "channel" ? presentFieldValue(partner.tradeLicense) : presentFieldValue(partner.emirateIdPassport)}`,
    `- Bank Account Name: ${presentFieldValue(partner.beneficiaryName)}`,
    `- Bank Name: ${getBankNameLine(partner)}`,
    `- Bank Account Number / IBAN: ${presentFieldValue(partner.accountNoIban)}`,
    `- SWIFT / BIC Code: ${presentFieldValue(partner.swiftBicCode)}`,
    "",
  ]

  for (const section of sections) {
    lines.push(section.title)
    for (const clause of section.clauses) {
      lines.push(`• ${clause}`)
    }
    lines.push("")
  }

  lines.push("Annexure I • Service List")
  services.forEach((service, index) => {
    lines.push(`${index + 1}. ${service}`)
  })
  lines.push("")
  lines.push(`Annexure II • ${partnerLabel} Commission Structure`)
  lines.push(`• Annual Packages: Initial commission ${commission.annual}`)
  lines.push(`• Annual Packages: Renewal commission ${commission.renewal}`)
  lines.push(`• Add-on Services: ${commission.addon}`)
  lines.push(`• Alternative Payment Plan: ${partnerLabel} receives ${commission.altRate}`)
  lines.push("• No commission on subsequent payments.")
  lines.push("• No commission on recurring add-on services.")
  lines.push("")
  lines.push("Actual package pricing and approved add-on service fees will be shared separately.")

  return lines.join("\n")
}

function drawAgreementBody(
  pdf: PDFDocument,
  text: string,
  bodyFont: PDFFont,
  headingFont: PDFFont,
  initialPage: ReturnType<typeof addNewPage>,
  initialY: number,
  sectionHeading?: string
) {
  let page = initialPage
  let y = initialY
  const maxWidth = PAGE_SIZE.width - MARGIN_X * 2
  let inAnnexure = false

  if (sectionHeading) {
    page.drawText(sectionHeading, {
      x: MARGIN_X,
      y,
      size: 13,
      font: headingFont,
      color: rgb(0.09, 0.11, 0.15),
    })
    y -= 22
  }

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim()

    if (!line) {
      y -= 6
      continue
    }

    if (y < BOTTOM_Y) {
      page = addNewPage(pdf)
      y = TOP_Y
    }

    const isPartyHeading = /^(First Party|Second Party)$/.test(line)
    const isAnnexureHeading = /^Annexure\s/i.test(line)
    const isSectionHeading = !inAnnexure && /^\d{1,2}\.\s+[A-Z]/.test(line)
    const isBullet = line.startsWith("•")
    const isKeyValue = line.startsWith("- ")
    const isNumberedItem = /^\d+\.\s/.test(line)

    if (isAnnexureHeading) {
      inAnnexure = true
    } else if (isPartyHeading || isSectionHeading) {
      inAnnexure = false
    }

    if (isPartyHeading || isAnnexureHeading) {
      page.drawText(line, {
        x: MARGIN_X,
        y,
        size: 10.5,
        font: headingFont,
        color: rgb(0.18, 0.24, 0.55),
      })
      y -= LINE_HEIGHT + 2
    } else if (isSectionHeading) {
      y -= 4
      if (y < BOTTOM_Y) {
        page = addNewPage(pdf)
        y = TOP_Y
      }
      page.drawText(line, {
        x: MARGIN_X,
        y,
        size: 10.5,
        font: headingFont,
        color: rgb(0.09, 0.11, 0.15),
      })
      y -= LINE_HEIGHT + 2
    } else if (isBullet) {
      const bulletText = line.slice(1).trim()
      const indentX = MARGIN_X + 14
      const wrapped = wrapText(bulletText, bodyFont, BODY_FONT_SIZE, maxWidth - 14)
      for (let i = 0; i < wrapped.length; i++) {
        if (y < BOTTOM_Y) {
          page = addNewPage(pdf)
          y = TOP_Y
        }
        if (i === 0) {
          page.drawText("•", {
            x: MARGIN_X + 2,
            y,
            size: BODY_FONT_SIZE,
            font: bodyFont,
            color: rgb(0.12, 0.14, 0.18),
          })
        }
        page.drawText(wrapped[i], {
          x: indentX,
          y,
          size: BODY_FONT_SIZE,
          font: bodyFont,
          color: rgb(0.12, 0.14, 0.18),
        })
        y -= LINE_HEIGHT
      }
      y -= 2
    } else if (isKeyValue) {
      const kvText = line.slice(2)
      const wrapped = wrapText(kvText, bodyFont, BODY_FONT_SIZE, maxWidth - 12)
      for (const wl of wrapped) {
        if (y < BOTTOM_Y) {
          page = addNewPage(pdf)
          y = TOP_Y
        }
        page.drawText(wl, {
          x: MARGIN_X + 12,
          y,
          size: BODY_FONT_SIZE,
          font: bodyFont,
          color: rgb(0.22, 0.24, 0.28),
        })
        y -= LINE_HEIGHT
      }
    } else if (isNumberedItem) {
      const wrapped = wrapText(line, bodyFont, BODY_FONT_SIZE, maxWidth - 12)
      for (const wl of wrapped) {
        if (y < BOTTOM_Y) {
          page = addNewPage(pdf)
          y = TOP_Y
        }
        page.drawText(wl, {
          x: MARGIN_X + 12,
          y,
          size: BODY_FONT_SIZE,
          font: bodyFont,
          color: rgb(0.12, 0.14, 0.18),
        })
        y -= LINE_HEIGHT
      }
    } else {
      const wrapped = wrapText(line, bodyFont, BODY_FONT_SIZE, maxWidth)
      for (const wl of wrapped) {
        if (y < BOTTOM_Y) {
          page = addNewPage(pdf)
          y = TOP_Y
        }
        page.drawText(wl, {
          x: MARGIN_X,
          y,
          size: BODY_FONT_SIZE,
          font: bodyFont,
          color: rgb(0.12, 0.14, 0.18),
        })
        y -= LINE_HEIGHT
      }
    }
  }

  return { page, y }
}

function drawChip(
  page: ReturnType<typeof addNewPage>,
  font: PDFFont,
  text: string,
  x: number,
  y: number,
  background: [number, number, number],
  foreground: [number, number, number]
) {
  const fontSize = 10
  const textWidth = font.widthOfTextAtSize(text, fontSize)
  const width = textWidth + 20
  const height = 24

  page.drawRectangle({
    x,
    y: y - height + 6,
    width,
    height,
    color: rgb(...background),
    borderColor: rgb(...background),
    borderWidth: 1,
  })

  page.drawText(text, {
    x: x + 10,
    y: y - 10,
    size: fontSize,
    font,
    color: rgb(...foreground),
  })
}

async function loadOptionalPublicImage(fileName: string) {
  try {
    return await readFile(path.join(process.cwd(), "public", fileName))
  } catch {
    return null
  }
}

async function drawSignatureSection(
  pdf: PDFDocument,
  pageState: { page: ReturnType<typeof addNewPage>; y: number },
  headingFont: PDFFont,
  bodyFont: PDFFont,
  accentFont: PDFFont,
  input: CreateSignedAgreementPdfInput
) {
  let { page, y } = pageState

  if (y < 330) {
    page = addNewPage(pdf)
    y = TOP_Y
  }

  page.drawLine({
    start: { x: MARGIN_X, y },
    end: { x: PAGE_SIZE.width - MARGIN_X, y },
    thickness: 1,
    color: rgb(0.82, 0.84, 0.88),
  })
  y -= 28

  page.drawText("Execution", {
    x: MARGIN_X,
    y,
    size: 15,
    font: headingFont,
    color: rgb(0.09, 0.11, 0.15),
  })
  y -= 22

  const columnWidth = (PAGE_INNER_WIDTH - 18) / 2
  const leftX = MARGIN_X
  const rightX = MARGIN_X + columnWidth + 18
  const cardHeight = 220

  page.drawRectangle({
    x: leftX,
    y: y - cardHeight,
    width: columnWidth,
    height: cardHeight,
    color: rgb(0.97, 0.98, 0.99),
    borderColor: rgb(0.86, 0.89, 0.93),
    borderWidth: 1,
  })
  page.drawRectangle({
    x: rightX,
    y: y - cardHeight,
    width: columnWidth,
    height: cardHeight,
    color: rgb(0.97, 0.98, 0.99),
    borderColor: rgb(0.86, 0.89, 0.93),
    borderWidth: 1,
  })

  page.drawText("First Party", {
    x: leftX + 18,
    y: y - 18,
    size: 11,
    font: headingFont,
    color: rgb(0.4, 0.45, 0.55),
  })
  page.drawText("Second Party", {
    x: rightX + 18,
    y: y - 18,
    size: 11,
    font: headingFont,
    color: rgb(0.4, 0.45, 0.55),
  })

  const ownerSignature = await loadOptionalPublicImage("finanshels-owner-signature.png")
  const ownerStamp = await loadOptionalPublicImage("finanshels-owner-stamp.png")

  if (ownerSignature) {
    const image = await pdf.embedPng(ownerSignature)
    const width = 150
    const scale = width / image.width
    const height = image.height * scale
    page.drawImage(image, {
      x: leftX + 18,
      y: y - 48 - height,
      width,
      height,
    })
  } else {
    page.drawText(FIRST_PARTY.signatory, {
      x: leftX + 18,
      y: y - 74,
      size: 22,
      font: accentFont,
      color: rgb(0.18, 0.24, 0.55),
    })
  }

  if (ownerStamp) {
    const image = await pdf.embedPng(ownerStamp)
    const width = 72
    const scale = width / image.width
    const height = image.height * scale
    page.drawImage(image, {
      x: leftX + columnWidth - width - 18,
      y: y - 48 - height / 2,
      width,
      height,
    })
  }

  let signatureCursorY = y - 62
  if (input.signatureType === "upload" && input.signatureImageBytes?.length) {
    let signatureImage
    if (input.signatureImageMimeType === "image/png") {
      signatureImage = await pdf.embedPng(input.signatureImageBytes)
    } else {
      signatureImage = await pdf.embedJpg(input.signatureImageBytes)
    }
    const width = 150
    const scale = width / signatureImage.width
    const height = signatureImage.height * scale
    page.drawImage(signatureImage, {
      x: rightX + 18,
      y: signatureCursorY - height,
      width,
      height,
    })
    signatureCursorY -= height + 10
  } else {
    const sigSize = 28
    const sigY = signatureCursorY - 16
    page.drawText(input.signerName, {
      x: rightX + 18,
      y: sigY,
      size: sigSize,
      font: accentFont,
      color: rgb(0.18, 0.24, 0.55),
    })
    const sigTextWidth = accentFont.widthOfTextAtSize(input.signerName, sigSize)
    page.drawLine({
      start: { x: rightX + 18, y: sigY - 5 },
      end: { x: Math.min(rightX + 18 + sigTextWidth, rightX + columnWidth - 18), y: sigY - 5 },
      thickness: 0.5,
      color: rgb(0.18, 0.24, 0.55),
    })
    signatureCursorY -= 44
  }

  const leftMetaY = y - cardHeight + 78
  const rightMetaY = y - cardHeight + 78

  page.drawLine({
    start: { x: leftX + 10, y: leftMetaY + 12 },
    end: { x: leftX + columnWidth - 10, y: leftMetaY + 12 },
    thickness: 0.5,
    color: rgb(0.86, 0.89, 0.93),
  })
  page.drawLine({
    start: { x: rightX + 10, y: rightMetaY + 12 },
    end: { x: rightX + columnWidth - 10, y: rightMetaY + 12 },
    thickness: 0.5,
    color: rgb(0.86, 0.89, 0.93),
  })

  const firstPartyMeta = [
    FIRST_PARTY.signatory,
    FIRST_PARTY.designation,
    "Authorized Signatory",
    FIRST_PARTY.company,
    `Date: ${formatAgreementDate(input.signedAt)}`,
  ]
  const secondPartyDesig = input.signerDesignation || ""
  const secondPartyMeta = [
    input.signerName,
    ...(secondPartyDesig && secondPartyDesig !== "Authorized Signatory"
      ? [secondPartyDesig, "Authorized Signatory"]
      : ["Authorized Signatory"]),
    input.partnerCompanyName,
    `Date: ${formatAgreementDate(input.signedAt)}`,
  ]

  firstPartyMeta.forEach((line, index) => {
    page.drawText(line, {
      x: leftX + 18,
      y: leftMetaY - index * 16,
      size: 10,
      font: bodyFont,
      color: rgb(0.22, 0.24, 0.28),
    })
  })

  secondPartyMeta.forEach((line, index) => {
    page.drawText(line, {
      x: rightX + 18,
      y: rightMetaY - index * 16,
      size: 10,
      font: bodyFont,
      color: rgb(0.22, 0.24, 0.28),
    })
  })
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
  const labelFont = await pdf.embedFont(StandardFonts.HelveticaBold)
  const agreementText = await buildPrefilledAgreementText(
    input.agreementFilePath,
    input.partner
  )
  const effectiveDate = formatAgreementDate(input.partner.contractSentAt)

  const page = addNewPage(pdf)
  let y = TOP_Y

  page.drawText("Finanshels Partner Agreement", {
    x: MARGIN_X,
    y,
    size: 22,
    font: headingFont,
    color: rgb(0.09, 0.11, 0.15),
  })
  y -= 30

  page.drawText(input.agreementTitle, {
    x: MARGIN_X,
    y,
    size: 15,
    font: labelFont,
    color: rgb(0.18, 0.24, 0.55),
  })
  y -= 18

  const introLines = [
    `Effective Date: ${effectiveDate}`,
    "Jurisdiction: Dubai, UAE",
    `Second Party: ${input.partnerCompanyName}`,
    "This PDF reflects the agreement acknowledged during onboarding.",
  ]

  for (const line of introLines) {
    page.drawText(line, {
      x: MARGIN_X,
      y,
      size: 10.5,
      font: bodyFont,
      color: rgb(0.28, 0.31, 0.36),
    })
    y -= 15
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

export async function createExternalAgreementPdf(
  input: CreatePrefilledAgreementPdfInput
): Promise<{
  pdfBytes: Buffer
  signaturePlacement: AgreementExternalSignaturePlacement
}> {
  const previewBytes = await createPrefilledAgreementPdf(input)
  const pdf = await PDFDocument.load(previewBytes)
  const headingFont = await pdf.embedFont(StandardFonts.HelveticaBold)
  const bodyFont = await pdf.embedFont(StandardFonts.Helvetica)
  const page = addNewPage(pdf)

  page.drawText("Signature Page", {
    x: MARGIN_X,
    y: TOP_Y,
    size: 22,
    font: headingFont,
    color: rgb(0.09, 0.11, 0.15),
  })

  const introLines = [
    "This agreement requires an authorised signature.",
    "By signing, the authorised representative confirms that they have reviewed the agreement and accept it on behalf of the partner entity.",
    `Partner company: ${input.partnerCompanyName}`,
    `Partner type: ${input.partnerTypeLabel}`,
  ]

  let y = TOP_Y - 38
  const maxWidth = PAGE_SIZE.width - MARGIN_X * 2

  for (const line of introLines) {
    for (const wrappedLine of wrapText(line, bodyFont, 11, maxWidth)) {
      page.drawText(wrappedLine, {
        x: MARGIN_X,
        y,
        size: 11,
        font: bodyFont,
        color: rgb(0.22, 0.24, 0.28),
      })
      y -= 16
    }
    y -= 4
  }

  const signatureX = 70
  const signatureY = 350
  const signatureWidth = 220
  const signatureHeight = 64

  page.drawText("Authorised signature", {
    x: signatureX,
    y: signatureY + signatureHeight + 24,
    size: 11,
    font: headingFont,
    color: rgb(0.09, 0.11, 0.15),
  })

  page.drawRectangle({
    x: signatureX,
    y: signatureY,
    width: signatureWidth,
    height: signatureHeight,
    borderColor: rgb(0.55, 0.58, 0.64),
    borderWidth: 1,
  })

  page.drawText("Authorised signature will be placed here.", {
    x: signatureX + 12,
    y: signatureY + signatureHeight / 2 - 4,
    size: 10,
    font: bodyFont,
    color: rgb(0.45, 0.48, 0.53),
  })

  page.drawText("Date", {
    x: signatureX,
    y: signatureY - 54,
    size: 11,
    font: headingFont,
    color: rgb(0.09, 0.11, 0.15),
  })

  page.drawLine({
    start: { x: signatureX, y: signatureY - 60 },
    end: { x: signatureX + 220, y: signatureY - 60 },
    thickness: 1,
    color: rgb(0.55, 0.58, 0.64),
  })

  const bytes = await pdf.save()
  return {
    pdfBytes: Buffer.from(bytes),
    signaturePlacement: {
      pageNo: pdf.getPageCount() - 1,
      xCoord: signatureX,
      yCoord: PAGE_SIZE.height - signatureY - signatureHeight,
      width: signatureWidth,
      height: signatureHeight,
    },
  }
}

export async function createSignedAgreementPdf(
  input: CreateSignedAgreementPdfInput
) {
  const pdf = await PDFDocument.create()
  const headingFont = await pdf.embedFont(StandardFonts.HelveticaBold)
  const bodyFont = await pdf.embedFont(StandardFonts.Helvetica)
  const accentFont = await pdf.embedFont(StandardFonts.TimesRomanItalic)
  const agreementText = await buildPrefilledAgreementText(
    input.agreementFilePath,
    input.partner
  )
  const effectiveDate = formatAgreementDate(input.partner.contractSentAt)

  const page = addNewPage(pdf)
  let y = TOP_Y

  page.drawText("Finanshels Partner Agreement", {
    x: MARGIN_X,
    y,
    size: 22,
    font: headingFont,
    color: rgb(0.09, 0.11, 0.15),
  })
  y -= 30

  page.drawText(input.agreementTitle, {
    x: MARGIN_X,
    y,
    size: 15,
    font: headingFont,
    color: rgb(0.18, 0.24, 0.55),
  })
  y -= 18

  drawChip(
    page,
    headingFont,
    "Digitally executed copy",
    MARGIN_X,
    y,
    [0.91, 0.98, 0.95],
    [0.05, 0.47, 0.27]
  )
  y -= 26

  const introLines = [
    `Effective Date: ${effectiveDate}`,
    "Jurisdiction: Dubai, UAE",
    `Signed by: ${input.signerName}`,
    `Signed on: ${input.signedAt.toLocaleString("en-AE", {
      dateStyle: "long",
      timeStyle: "short",
    })}`,
  ]

  for (const line of introLines) {
    page.drawText(line, {
      x: MARGIN_X,
      y,
      size: 10.5,
      font: bodyFont,
      color: rgb(0.28, 0.31, 0.36),
    })
    y -= 15
  }

  y -= 6
  page.drawLine({
    start: { x: MARGIN_X, y },
    end: { x: PAGE_SIZE.width - MARGIN_X, y },
    thickness: 1,
    color: rgb(0.82, 0.84, 0.88),
  })
  y -= 26

  const pageState = drawAgreementBody(pdf, agreementText, bodyFont, headingFont, page, y)

  await drawSignatureSection(
    pdf,
    pageState,
    headingFont,
    bodyFont,
    accentFont,
    input
  )

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
