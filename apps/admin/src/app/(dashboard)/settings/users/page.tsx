import { auth } from "@repo/auth/server"
import { db, teamMembers } from "@repo/db"
import { eq } from "drizzle-orm"
import Link from "next/link"
import { redirect } from "next/navigation"
import { Plus, Shield, Users } from "lucide-react"
import { UserActionsMenu } from "./actions"
import { getActiveTeamMember } from "@/lib/admin-auth"
import { getRequiredTenantId } from "@/lib/env"

const ROLE_META: Record<string, { label: string; color: string; perms: string }> = {
  admin:            { label: "Admin",            color: "bg-red-950/60 border-red-800/40 text-red-400",         perms: "Full access" },
  partnership:      { label: "Partnership",      color: "bg-indigo-950/60 border-indigo-800/40 text-indigo-400", perms: "Partners + Leads + Services" },
  sales:            { label: "Sales",            color: "bg-blue-950/60 border-blue-800/40 text-blue-400",       perms: "Lead pipeline + conversions" },
  appointment_setter:{ label: "Appt. Setter",   color: "bg-cyan-950/60 border-cyan-800/40 text-cyan-400",       perms: "Create/edit leads only" },
  finance:          { label: "Finance",          color: "bg-yellow-950/60 border-yellow-800/40 text-yellow-400", perms: "Invoices + commissions" },
  viewer:           { label: "Viewer",           color: "bg-zinc-800 border-zinc-700 text-zinc-400",             perms: "Read-only analytics" },
}

const MODULES = ["partners", "leads", "services", "invoices", "commissions", "users", "analytics"]

export default async function UsersPage() {
  const { userId } = await auth()
  if (!userId) {
    redirect("/sign-in")
  }

  const member = await getActiveTeamMember(userId)
  if (!member || member.role !== "admin") {
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

      {/* Role legend */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-zinc-500" />
          <h2 className="text-zinc-100 font-semibold text-sm">Role Permissions Matrix</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="pb-2 text-left text-zinc-500 font-medium w-32">Role</th>
                {MODULES.map((m) => (
                  <th key={m} className="pb-2 text-center text-zinc-500 font-medium capitalize px-2">
                    {m}
                  </th>
                ))}
                <th className="pb-2 text-left text-zinc-500 font-medium pl-4">Scope</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {Object.entries(ROLE_META).map(([role, meta]) => {
                const defaultPerms = getDefaultPerms(role)
                return (
                  <tr key={role}>
                    <td className="py-2.5 pr-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${meta.color}`}>
                        {meta.label}
                      </span>
                    </td>
                    {MODULES.map((mod) => {
                      const perm = defaultPerms[mod] ?? ""
                      return (
                        <td key={mod} className="py-2.5 text-center px-2">
                          {perm === "rw" ? (
                            <span className="text-green-400 font-medium">R/W</span>
                          ) : perm === "r" ? (
                            <span className="text-blue-400">R</span>
                          ) : (
                            <span className="text-zinc-700">—</span>
                          )}
                        </td>
                      )
                    })}
                    <td className="py-2.5 pl-4 text-zinc-500">all</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
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
                  const roleMeta = ROLE_META[m.role] ?? ROLE_META.viewer!
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
                        <UserActionsMenu memberId={m.id} isActive={m.isActive} />
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

function getDefaultPerms(role: string): Record<string, string> {
  const matrix: Record<string, Record<string, string>> = {
    admin:             { partners:"rw", leads:"rw", services:"rw", invoices:"rw", commissions:"rw", users:"rw", analytics:"r" },
    partnership:       { partners:"rw", leads:"rw", services:"rw", invoices:"r",  commissions:"r",  users:"r",  analytics:"r" },
    sales:             { partners:"r",  leads:"rw", services:"r",  invoices:"r",  commissions:"r",  users:"",   analytics:"r" },
    appointment_setter:{ partners:"r",  leads:"rw", services:"",   invoices:"",   commissions:"",   users:"",   analytics:"" },
    finance:           { partners:"r",  leads:"r",  services:"r",  invoices:"rw", commissions:"rw", users:"",   analytics:"r" },
    viewer:            { partners:"r",  leads:"r",  services:"r",  invoices:"r",  commissions:"r",  users:"",   analytics:"r" },
  }
  return matrix[role] ?? {}
}
