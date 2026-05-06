import { redirect } from "next/navigation"

/**
 * Service requests are the cross-sell track inside Leads — keep a single module entry
 * point so “back” and bookmarks land on the unified inbox, not a separate nav surface.
 */
export default async function ServiceRequestsInboxRedirect({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const q = await searchParams
  const params = new URLSearchParams()
  params.set("kind", "cross_sell")
  if (typeof q.status === "string" && q.status.trim()) {
    params.set("status", q.status.trim())
  }
  redirect(`/leads?${params.toString()}`)
}
