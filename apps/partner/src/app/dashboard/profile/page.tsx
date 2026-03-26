import { currentUser } from "@clerk/nextjs/server"
import { User, Mail, Building2 } from "lucide-react"
export default async function ProfilePage() {
  const user = await currentUser()
  return (
    <div className="max-w-2xl space-y-6">
      <div><h1 className="text-2xl font-bold text-white">Profile</h1><p className="text-zinc-400 text-sm mt-1">Your partner account details</p></div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-4 pb-4 border-b border-zinc-800">
          <div className="w-14 h-14 rounded-full bg-blue-600/20 border border-blue-600/30 flex items-center justify-center"><User className="w-7 h-7 text-blue-400"/></div>
          <div><p className="text-zinc-100 font-semibold text-lg">{[user?.firstName,user?.lastName].filter(Boolean).join(" ")||"Partner"}</p><p className="text-zinc-500 text-sm">{user?.emailAddresses[0]?.emailAddress}</p></div>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-3"><Mail className="w-4 h-4 text-zinc-500"/><div><p className="text-zinc-500 text-xs">Email</p><p className="text-zinc-200 text-sm">{user?.emailAddresses[0]?.emailAddress||"—"}</p></div></div>
          <div className="flex items-center gap-3"><Building2 className="w-4 h-4 text-zinc-500"/><div><p className="text-zinc-500 text-xs">Account ID</p><p className="text-zinc-200 text-xs font-mono">{user?.id||"—"}</p></div></div>
        </div>
      </div>
    </div>
  )
}
