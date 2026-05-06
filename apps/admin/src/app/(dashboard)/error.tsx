"use client"

import { useEffect } from "react"
import { DatabaseFallbackCard } from "@/components/database-fallback-card"
import {
  getDatabaseErrorHost,
  isDatabaseConnectivityError,
  isInvalidUuidQueryError,
  isPostgresSchemaMismatchError,
} from "@/lib/database-error"

function devErrorDetails(error: Error & { digest?: string }) {
  if (process.env.NODE_ENV !== "development") {
    return null
  }

  const parts = [error.message, error.digest ? `digest: ${error.digest}` : ""].filter(Boolean)
  return parts.join("\n") || null
}

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

  if (isPostgresSchemaMismatchError(error)) {
    return (
      <DatabaseFallbackCard
        eyebrow="Schema mismatch"
        title="Database is missing columns this build expects"
        message="Apply pending SQL migrations so Postgres matches the Drizzle schema (for example run `npm run db:migrate` from the repo root using `DATABASE_URL_DIRECT`). Then reload this page."
        details={devErrorDetails(error)}
        onRetry={reset}
        showConnectionTips={false}
      />
    )
  }

  if (isInvalidUuidQueryError(error)) {
    return (
      <DatabaseFallbackCard
        eyebrow="Invalid link"
        title="This URL is not a valid record id"
        message="Open the record from the in-app list instead of editing the address bar."
        details={devErrorDetails(error)}
        onRetry={reset}
        showConnectionTips={false}
      />
    )
  }

  return (
    <DatabaseFallbackCard
      eyebrow="Page error"
      title="Admin page failed to render"
      message="A server-side error interrupted this page. Check the terminal for the full stack trace, fix the underlying issue, and retry."
      details={devErrorDetails(error)}
      onRetry={reset}
      showConnectionTips={false}
    />
  )
}
