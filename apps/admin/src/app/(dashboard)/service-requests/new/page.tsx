import { redirect } from "next/navigation"

export default async function NewServiceRequestPage() {
  redirect("/leads/new?leadType=existing")
}
