import { redirect } from "next/navigation"

export default function ServiceRequestsPage() {
  redirect("/dashboard/leads?kind=cross_sell")
}
