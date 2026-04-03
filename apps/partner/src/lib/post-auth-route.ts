import { getPartnerPostAuthRoute } from "@/lib/partner-record"

function isSafeRelativePath(candidate: string | null | undefined) {
  return Boolean(candidate && candidate.startsWith("/") && !candidate.startsWith("//"))
}

function canUseRequestedPath(canonicalPath: string, requestedPath: string) {
  if (canonicalPath === "/dashboard") {
    return requestedPath.startsWith("/dashboard")
  }

  if (canonicalPath === "/dashboard/profile") {
    return requestedPath.startsWith("/dashboard/profile")
  }

  if (canonicalPath === "/onboarding") {
    return requestedPath.startsWith("/onboarding")
  }

  return false
}

export async function resolvePartnerPostAuthRoute(
  userId: string,
  requestedPath?: string | null,
) {
  const canonicalPath = await getPartnerPostAuthRoute(userId)

  if (!isSafeRelativePath(requestedPath)) {
    return canonicalPath
  }

  return canUseRequestedPath(canonicalPath, requestedPath!) ? requestedPath! : canonicalPath
}
