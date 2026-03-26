"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
const SERVICES=["Tax Registration","VAT Filing","Bookkeeping","Company Formation","Audit & Assurance","CFO Services"]
export default function NewServiceRequestPage() {
  const router=useRouter()
  const [loading,setLoading]=useState(false)
  const [form,setForm]=useState({clientName:"",clientEmail:"",serviceType:"",description:""})
  async function submit(e:React.FormEvent){e.preventDefault();setLoading(true);try{const r=await fetch("/api/service-requests",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});if(!r.ok)throw new Error("Failed");toast.success("Request submitted!");router.push("/dashboard/service-requests")}catch{toast.error("Something went wrong")}finally{setLoading(false)}}
  return (
    <div className="max-w-2xl space-y-6">
      <div><h1 className="text-2xl font-bold text-white">New Service Request</h1><p className="text-zinc-400 text-sm mt-1">Request a Finanshels service for a client</p></div>
      <form onSubmit={submit} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className="block text-zinc-300 text-sm font-medium mb-1.5">Client Name <span className="text-red-400">*</span></label><input required value={form.clientName} onChange={e=>setForm(f=>({...f,clientName:e.target.value}))} className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-blue-500" placeholder="Client name"/></div>
          <div><label className="block text-zinc-300 text-sm font-medium mb-1.5">Client Email <span className="text-red-400">*</span></label><input required type="email" value={form.clientEmail} onChange={e=>setForm(f=>({...f,clientEmail:e.target.value}))} className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-blue-500" placeholder="client@example.com"/></div>
        </div>
        <div><label className="block text-zinc-300 text-sm font-medium mb-1.5">Service Type <span className="text-red-400">*</span></label><select required value={form.serviceType} onChange={e=>setForm(f=>({...f,serviceType:e.target.value}))} className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 text-sm focus:outline-none focus:border-blue-500"><option value="">Select a service...</option>{SERVICES.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
        <div><label className="block text-zinc-300 text-sm font-medium mb-1.5">Description</label><textarea rows={3} value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 resize-none" placeholder="Describe what you need..."/></div>
        <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors text-sm">{loading?"Submitting...":"Submit Request"}</button>
      </form>
    </div>
  )
}
