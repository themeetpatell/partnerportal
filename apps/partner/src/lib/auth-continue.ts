function isSafeRelativePath(candidate: string | null | undefined) {
  return Boolean(candidate && candidate.startsWith("/") && !candidate.startsWith("//"))
}

export function buildAuthContinueHref(nextPath?: string | null) {
  if (!isSafeRelativePath(nextPath)) {
    return "/auth/continue"
  }

  const params = new URLSearchParams({ next: nextPath! })
  return `/auth/continue?${params.toString()}`
}
