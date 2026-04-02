import { auth } from "@repo/auth/server"
import { NextResponse } from "next/server"
import { db, partners } from "@repo/db"
import { eq } from "drizzle-orm"
import {
  createPrefilledAgreementPdf,
  getAgreementFilePath,
  getAgreementTitle,
} from "@/lib/signed-agreement"

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const [partner] = await db
    .select()
    .from(partners)
    .where(eq(partners.authUserId, userId))
    .limit(1)

  if (!partner) {
    return NextResponse.json({ error: "Partner record not found." }, { status: 404 })
  }

  if (!partner.agreementUrl || partner.contractStatus === "not_sent") {
    return NextResponse.json(
      { error: "No agreement is available yet." },
      { status: 400 }
    )
  }

  const pdfBytes = await createPrefilledAgreementPdf({
    agreementFilePath: getAgreementFilePath(partner.type as "referral" | "channel"),
    agreementTitle: getAgreementTitle(partner.type as "referral" | "channel"),
    partnerCompanyName: partner.companyName,
    partnerTypeLabel:
      partner.type === "channel" ? "Channel Partner" : "Referral Partner",
    generatedAt: new Date(),
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
  })

  const fileName = `${slugify(partner.companyName) || "partner"}-agreement-preview.pdf`

  return new NextResponse(pdfBytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${fileName}"`,
    },
  })
}
