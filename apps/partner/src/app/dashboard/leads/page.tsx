"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { Plus, ArrowRight } from "lucide-react"
type Lead = { id: string; customerName: string; customerEmail: string; status: string; createdAt: string }
const statusColors: Record<string,string> = { submitted:"bg-blue-950/50 text-blue-400 border-blue-800/40", in_review:"bg-yellow-950/50 text-yellow-400 border-yellow-800/40", qualified:"bg-purple-950/50 text-purple-400 border-purple-800/40", proposal_sent:"bg-orange-950/50 text-orange-400 border-orange-800/40", converted:"bg-green-950/50 text-green-400 border-green-800/40", rejected:"bg-red-950/50 text-red-400 border-red-800/40" }
export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => { fetch("/api/leads").then(r=>r.json()).then(d=>{setLeads(d.leads||[]);setLoading(false)}).catch(()=>setLoading(false)) }, [])
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-white">My Leads</h1><p className="text-zinc-400 text-sm mt-1">Track all leads you&apos;ve submitted</p></div>
        <Link href="/dashboard/leads/new" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"><Plus className="w-4 h-4"/>Submit Lead</Link>
      </div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        {loading ? <div className="p-8 text-center text-zinc-500 text-sm">Loading...</div>
        : leads.length === 0 ? <div className="p-12 text-center"><p className="text-zinc-400 font-medium mb-1">No leads yet</p><p className="text-zinc-600 text-sm mb-4">Submit your first lead to get started</p><Link href="/dashboard/leads/new" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm">Submit a lead <ArrowRight className="w-3.5 h-3.5"/></Link></div>
        : <table className="w-full text-sm"><thead><tr className="border-b border-zinc-800"><th className="text-left text-zinc-500 font-medium px-6 py-3">Customer</th><th className="text-left text-zinc-500 font-medium px-6 py-3">Email</th><th className="text-left text-zinc-500 font-medium px-6 py-3">Status</th><th className="text-left text-zinc-500 font-medium px-6 py-3">Date</th></tr></thead><tbody>{leads.map(lead=><tr key={lead.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30"><td className="px-6 py-4 text-zinc-200 font-medium">{lead.customerName}</td><td className="px-6 py-4 text-zinc-400">{lead.customerEmail}</td><td className="px-6 py-4"><span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${statusColors[lead.status]||"bg-zinc-800 text-zinc-400 border-zinc-700"}`}>{lead.status.replace(/_/g," ")}</span></td><td className="px-6 py-4 text-zinc-500">{new Date(lead.createdAt).toLocaleDateString()}</td></tr>)}</tbody></table>}
      </div>
    </div>
  )
}
