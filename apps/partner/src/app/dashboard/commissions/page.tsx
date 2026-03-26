"use client"
import { useEffect, useState } from "react"
import { DollarSign, TrendingUp, CheckCircle2 } from "lucide-react"
type Commission = { id:string; amount:string; status:string; createdAt:string }
const statusColors:Record<string,string> = { pending:"bg-yellow-950/50 text-yellow-400 border-yellow-800/40", approved:"bg-blue-950/50 text-blue-400 border-blue-800/40", paid:"bg-green-950/50 text-green-400 border-green-800/40" }
export default function CommissionsPage() {
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(()=>{fetch("/api/commissions").then(r=>r.json()).then(d=>{setCommissions(d.commissions||[]);setLoading(false)}).catch(()=>setLoading(false))},[])
  const paid = commissions.filter(c=>c.status==="paid").reduce((s,c)=>s+parseFloat(c.amount),0)
  const pending = commissions.filter(c=>c.status!=="paid").reduce((s,c)=>s+parseFloat(c.amount),0)
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-white">Commissions</h1><p className="text-zinc-400 text-sm mt-1">Track your earnings and payout history</p></div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[{label:"Total Earned",value:`AED ${paid.toFixed(2)}`,icon:CheckCircle2,color:"text-green-400",bg:"bg-green-950/40 border-green-800/30"},{label:"Pending Payout",value:`AED ${pending.toFixed(2)}`,icon:TrendingUp,color:"text-yellow-400",bg:"bg-yellow-950/40 border-yellow-800/30"},{label:"Total Records",value:commissions.length.toString(),icon:DollarSign,color:"text-blue-400",bg:"bg-blue-950/40 border-blue-800/30"}].map(s=>(
          <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5"><div className={`w-10 h-10 rounded-lg border flex items-center justify-center mb-3 ${s.bg}`}><s.icon className={`w-5 h-5 ${s.color}`}/></div><p className="text-2xl font-bold text-white">{s.value}</p><p className="text-zinc-400 text-sm mt-0.5">{s.label}</p></div>
        ))}
      </div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-800"><h2 className="text-zinc-100 font-semibold text-sm">Commission History</h2></div>
        {loading?<div className="p-8 text-center text-zinc-500 text-sm">Loading...</div>:commissions.length===0?<div className="p-12 text-center"><p className="text-zinc-400 font-medium mb-1">No commissions yet</p><p className="text-zinc-600 text-sm">Commissions are generated when your leads convert</p></div>:<table className="w-full text-sm"><thead><tr className="border-b border-zinc-800"><th className="text-left text-zinc-500 font-medium px-6 py-3">Amount</th><th className="text-left text-zinc-500 font-medium px-6 py-3">Status</th><th className="text-left text-zinc-500 font-medium px-6 py-3">Date</th></tr></thead><tbody>{commissions.map(c=><tr key={c.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30"><td className="px-6 py-4 text-zinc-200 font-medium">AED {parseFloat(c.amount).toFixed(2)}</td><td className="px-6 py-4"><span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${statusColors[c.status]||"bg-zinc-800 text-zinc-400 border-zinc-700"}`}>{c.status}</span></td><td className="px-6 py-4 text-zinc-500">{new Date(c.createdAt).toLocaleDateString()}</td></tr>)}</tbody></table>}
      </div>
    </div>
  )
}
