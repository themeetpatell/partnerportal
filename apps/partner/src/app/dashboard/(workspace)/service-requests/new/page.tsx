import { redirect } from "next/navigation"

export default function NewServiceRequestPage() {
  redirect("/dashboard/leads/new?leadType=existing")
}
