"use client"

import { useEffect } from "react"
import { DatabaseFallbackCard } from "@/components/database-fallback-card"
import { getDatabaseErrorHost, isDatabaseConnectivityError } from "@/lib/database-error"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  if (isDatabaseConnectivityError(error)) {
    return (
      <DatabaseFallbackCard
        title="Admin page is unavailable"
        message="This screen depends on Postgres, and the app could not establish a connection. Verify `DATABASE_URL`, confirm the hostname resolves, and retry once the database is reachable."
        host={getDatabaseErrorHost(error)}
        onRetry={reset}
      />
    )
  }

  return (
    <DatabaseFallbackCard
      title="Admin page failed to render"
      message="A server-side error interrupted this page. Check the terminal for the full stack trace, fix the underlying issue, and retry."
      onRetry={reset}
    />
  )
}
