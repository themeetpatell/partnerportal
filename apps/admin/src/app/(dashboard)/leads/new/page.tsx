import { db, partners, teamMembers, services } from "@repo/db"
import { eq, isNull } from "drizzle-orm"
import { NewLeadForm } from "./form"

export default async function NewLeadPage() {
  const [partnersList, membersList, servicesList] = await Promise.all([
    db
      .select({ id: partners.id, companyName: partners.companyName })
      .from(partners)
      .where(isNull(partners.deletedAt))
      .orderBy(partners.companyName),
    db
      .select({ clerkUserId: teamMembers.clerkUserId, name: teamMembers.name })
      .from(teamMembers)
      .where(eq(teamMembers.isActive, true))
      .orderBy(teamMembers.name),
    db
      .select({ id: services.id, name: services.name })
      .from(services)
      .where(eq(services.isActive, true))
      .orderBy(services.name),
  ])

  return (
    <NewLeadForm
      partners={partnersList}
      teamMembers={membersList}
      services={servicesList}
    />
  )
}
