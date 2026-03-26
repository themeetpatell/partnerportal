"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
const SERVICES = ["Tax Registration","VAT Filing","Bookkeeping","Company Formation","Audit & Assurance","CFO Services"]
export default function NewLeadPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ customerName:"", customerEmail:"", customerPhone:"", customerCompany:"", notes:"", serviceInterests:[] as string[] })
  function toggle(s:string){setForm(f=>({...f,serviceInterests:f.serviceInterests.includes(s)?f.serviceInterests.filter(x=>x!==s):[...f.serviceInterests,s]}))}
  async function submit(e:React.FormEvent){e.preventDefault();setLoading(true);try{const r=await fetch("/api/leads",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});const d=await r.json();if(!r.ok)throw new Error(d.error);toast.success("Lead submitted!");router.push("/dashboard/leads")}catch(err:unknown){toast.error(err instanceof Error?err.message:"Error")}finally{setLoading(false)}}
  return (
    <div className="max-w-2xl space-y-6">
      <div><h1 className="text-2xl font-bold text-white">Submit a Lead</h1><p className="text-zinc-400 text-sm mt-1">Refer a new client to Finanshels and earn commissions</p></div>
      <form onSubmit={submit} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[{label:"Full Name",key:"customerName",placeholder:"John Smith",type:"text",required:true},{label:"Email",key:"customerEmail",placeholder:"john@example.com",type:"email",required:true},{label:"Phone",key:"customerPhone",placeholder:"+971 50 000 0000",type:"text",required:false},{label:"Company",key:"customerCompany",placeholder:"Acme LLC",type:"text",required:false}].map(f=>(
            <div key={f.key}><label className="block text-zinc-300 text-sm font-medium mb-1.5">{f.label}{f.required&&<span className="text-red-400"> *</span>}</label><input required={f.required} type={f.type} value={(form as Record<string,unknown>)[f.key] as string} onChange={e=>setForm(prev=>({...prev,[f.key]:e.target.value}))} placeholder={f.placeholder} className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-blue-500"/></div>
          ))}
        </div>
        <div><label className="block text-zinc-300 text-sm font-medium mb-2">Services Interested In</label><div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{SERVICES.map(s=><button key={s} type="button" onClick={()=>toggle(s)} className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors text-left ${form.serviceInterests.includes(s)?"bg-blue-600/20 border-blue-600/50 text-blue-400":"bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600"}`}>{s}</button>)}</div></div>
        <div><label className="block text-zinc-300 text-sm font-medium mb-1.5">Notes</label><textarea rows={3} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Any additional context..." className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 resize-none"/></div>
        <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors text-sm">{loading?"Submitting...":"Submit Lead"}</button>
      </form>
    </div>
  )
}
