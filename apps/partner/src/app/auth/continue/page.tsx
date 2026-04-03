import { redirect } from "next/navigation"
import { auth } from "@repo/auth/server"
import { resolvePartnerPostAuthRoute } from "@/lib/post-auth-route"

export default async function AuthContinuePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { userId } = await auth()
  const params = await searchParams

  if (!userId) {
    const signInUrl = new URLSearchParams()
    if (params.next?.startsWith("/")) {
      signInUrl.set("next", params.next)
    }

    redirect(signInUrl.size > 0 ? `/sign-in?${signInUrl.toString()}` : "/sign-in")
  }

  const targetPath = await resolvePartnerPostAuthRoute(userId, params.next)
  redirect(targetPath)
}
