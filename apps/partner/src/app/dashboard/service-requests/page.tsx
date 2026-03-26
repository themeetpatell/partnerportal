import Link from "next/link"
import { Plus } from "lucide-react"
export default function ServiceRequestsPage() {
  return (<div className="space-y-6"><div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold text-white">Service Requests</h1><p className="text-zinc-400 text-sm mt-1">Manage service requests for your clients</p></div><Link href="/dashboard/service-requests/new" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"><Plus className="w-4 h-4"/>New Request</Link></div><div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center"><p className="text-zinc-400 font-medium mb-1">No service requests yet</p><p className="text-zinc-600 text-sm">Submit a service request to get started</p></div></div>)
}
