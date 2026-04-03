import { db, partners, services } from "@repo/db"
import { eq, isNull } from "drizzle-orm"
import { NewLeadForm } from "./form"

export default async function NewLeadPage() {
  const [partnersList, servicesList] = await Promise.all([
    db
      .select({ id: partners.id, companyName: partners.companyName })
      .from(partners)
      .where(isNull(partners.deletedAt))
      .orderBy(partners.companyName),
    db
      .select({ id: services.id, name: services.name })
      .from(services)
      .where(eq(services.isActive, true))
      .orderBy(services.name),
  ])

  return (
    <NewLeadForm
      partners={partnersList}
      services={servicesList}
    />
  )
}
