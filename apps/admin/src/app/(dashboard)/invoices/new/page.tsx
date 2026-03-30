import { db, partners, serviceRequests } from "@repo/db"
import { isNull } from "drizzle-orm"
import { NewInvoiceForm } from "./form"

export default async function NewInvoicePage() {
  const [partnersList, srList] = await Promise.all([
    db
      .select({ id: partners.id, companyName: partners.companyName })
      .from(partners)
      .where(isNull(partners.deletedAt))
      .orderBy(partners.companyName),
    db
      .select({
        id: serviceRequests.id,
        customerCompany: serviceRequests.customerCompany,
        partnerId: serviceRequests.partnerId,
        status: serviceRequests.status,
      })
      .from(serviceRequests)
      .where(isNull(serviceRequests.deletedAt))
      .orderBy(serviceRequests.createdAt),
  ])

  return <NewInvoiceForm partners={partnersList} serviceRequests={srList} />
}
