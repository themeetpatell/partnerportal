import { redirect } from "next/navigation"
import { currentUser } from "@repo/auth/server"
import { getCurrentActiveTeamMember } from "@/lib/admin-auth"
import { AdminProfileForm } from "@/components/admin-profile-form"

function formatRoleLabel(role: string | null | undefined) {
  if (!role) return "Admin"
  return role.split("_").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ")
}

export default async function AdminProfilePage() {
  const [user, member] = await Promise.all([currentUser(), getCurrentActiveTeamMember()])

  if (!member || !user) {
    redirect("/")
  }

  const firstName = member.firstName ?? user.firstName ?? ""
  const lastName = member.lastName ?? user.lastName ?? ""

  return (
    <AdminProfileForm
      initial={{
        firstName,
        lastName,
        email: member.email || user.email,
        phone: member.phone ?? "",
        designation: member.designation ?? "",
        avatarUrl: member.avatarUrl ?? null,
      }}
      roleLabel={formatRoleLabel(member.role)}
    />
  )
}
