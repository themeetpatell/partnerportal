import { auth } from "@repo/auth/server"
import { db, teamMembers } from "@repo/db"
import { eq } from "drizzle-orm"
import Link from "next/link"
import { redirect } from "next/navigation"
import { Plus, Users } from "lucide-react"
import { UserActionsMenu } from "./actions"
import { getCurrentActiveTeamMember } from "@/lib/admin-auth"
import { getRequiredTenantId } from "@/lib/env"
import {
  USER_MANAGEMENT_ROLES,
  getTeamRoleMeta,
  hasAnyTeamRole,
} from "@/lib/rbac"

export default async function UsersPage() {
  const [{ userId }, member] = await Promise.all([
    auth(),
    getCurrentActiveTeamMember(),
  ])

  if (!userId) {
    redirect("/sign-in")
  }

  if (!member || !hasAnyTeamRole(member.role, USER_MANAGEMENT_ROLES)) {
    redirect("/")
  }

  const tenantId = getRequiredTenantId()
  const members = await db
    .select()
    .from(teamMembers)
    .where(eq(teamMembers.tenantId, tenantId))
    .orderBy(teamMembers.createdAt)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Users &amp; Access</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Manage team members, roles, and permissions.
          </p>
        </div>
        <Link
          href="/settings/users/new"
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add User
        </Link>
      </div>

      {/* Members table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center gap-2">
          <Users className="w-4 h-4 text-zinc-500" />
          <h2 className="text-zinc-100 font-semibold text-sm">Team Members ({members.length})</h2>
        </div>
        {members.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-zinc-500 text-sm">No team members yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Designation</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Scope</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Joined</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {members.map((m) => {
                  const roleMeta = getTeamRoleMeta(m.role)
                  return (
                    <tr key={m.id} className="hover:bg-zinc-800/40 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-zinc-200 font-medium">{m.name}</p>
                        <p className="text-zinc-500 text-xs">{m.email}</p>
                        {m.phone ? <p className="text-zinc-600 text-xs mt-1">{m.phone}</p> : null}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-zinc-300 text-sm">
                          {m.designation || "Not set"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${roleMeta.color}`}>
                          {roleMeta.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-zinc-400 text-xs capitalize">{m.rowScope}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
                          m.isActive
                            ? "bg-green-950/60 border-green-800/40 text-green-400"
                            : "bg-zinc-800 border-zinc-700 text-zinc-500"
                        }`}>
                          {m.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-zinc-500 text-xs">
                        {new Date(m.createdAt).toLocaleDateString("en-AE", {
                          day: "numeric", month: "short", year: "numeric",
                        })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <UserActionsMenu memberId={m.id} isActive={m.isActive} email={m.email} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
