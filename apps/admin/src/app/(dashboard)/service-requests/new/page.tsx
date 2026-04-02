import { db, partners, services, leads, teamMembers } from "@repo/db"
import { eq, isNull } from "drizzle-orm"
import { NewServiceRequestForm } from "./form"

export default async function NewServiceRequestPage() {
  const [partnersList, servicesList, leadsList, membersList] = await Promise.all([
    db
      .select({ id: partners.id, companyName: partners.companyName })
      .from(partners)
      .where(isNull(partners.deletedAt))
      .orderBy(partners.companyName),
    db
      .select({ id: services.id, name: services.name, category: services.category })
      .from(services)
      .where(eq(services.isActive, true))
      .orderBy(services.name),
    db
      .select({ id: leads.id, customerName: leads.customerName, customerCompany: leads.customerCompany, partnerId: leads.partnerId })
      .from(leads)
      .where(isNull(leads.deletedAt))
      .orderBy(leads.createdAt),
    db
      .select({ authUserId: teamMembers.authUserId, name: teamMembers.name })
      .from(teamMembers)
      .where(eq(teamMembers.isActive, true))
      .orderBy(teamMembers.name),
  ])

  return (
    <NewServiceRequestForm
      partners={partnersList}
      services={servicesList}
      leads={leadsList}
      teamMembers={membersList}
    />
  )
}
