import path from "node:path"
import mammoth from "mammoth"
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
} from "pdf-lib"

type CreateSignedAgreementPdfInput = {
  agreementFilePath: string
  agreementTitle: string
  partnerCompanyName: string
  partnerTypeLabel: string
  signerName: string
  signerDesignation?: string | null
  signerEmail: string
  signatureType: "typed" | "upload"
  signedAt: Date
  signatureImageBytes?: Uint8Array | null
  signatureImageMimeType?: string | null
}

const PAGE_SIZE = { width: 595, height: 842 }
const MARGIN_X = 50
const TOP_Y = 792
const BOTTOM_Y = 55
const BODY_FONT_SIZE = 10
const LINE_HEIGHT = 14

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

export async function createSignedAgreementPdf(
  input: CreateSignedAgreementPdfInput
) {
  const pdf = await PDFDocument.create()
  const headingFont = await pdf.embedFont(StandardFonts.HelveticaBold)
  const bodyFont = await pdf.embedFont(StandardFonts.Helvetica)
  const agreementText = await extractAgreementText(input.agreementFilePath)

  let page = addNewPage(pdf)
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

  page.drawText("Agreement Text", {
    x: MARGIN_X,
    y,
    size: 13,
    font: headingFont,
    color: rgb(0.09, 0.11, 0.15),
  })
  y -= 22

  const paragraphs = agreementText.split(/\n{2,}/).map((chunk) => chunk.trim()).filter(Boolean)
  const maxWidth = PAGE_SIZE.width - MARGIN_X * 2

  for (const paragraph of paragraphs) {
    const lines = wrapText(paragraph.replace(/\n/g, " "), bodyFont, BODY_FONT_SIZE, maxWidth)
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

  const bytes = await pdf.save()
  return Buffer.from(bytes)
}

export function getAgreementTitle(type: "referral" | "channel") {
  return type === "channel"
    ? "Channel Partner Agreement 2026 V1.2"
    : "Referral Partner Agreement 2026 V1.2"
}

export function getAgreementFilePath(type: "referral" | "channel") {
  return path.join(
    process.cwd(),
    "public",
    "contracts",
    type === "channel"
      ? "channel-partner-agreement-2026-v1-2.docx"
      : "referral-partner-agreement-2026-v1-2.docx"
  )
}
