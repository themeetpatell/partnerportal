"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { getAuthBrowserClient } from "./client"

function hasRecoveryHash(hash: string) {
  const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash)
  return params.get("type") === "recovery" && Boolean(params.get("access_token"))
}

export function RecoverySessionRedirect({
  resetPath,
}: {
  resetPath: string
}) {
  const pathname = usePathname()

  useEffect(() => {
    const hash = window.location.hash
    if (!hasRecoveryHash(hash)) {
      return
    }

    if (pathname !== resetPath) {
      window.location.replace(`${resetPath}${hash}`)
      return
    }

    const client = getAuthBrowserClient()

    void client.auth.getSession().finally(() => {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`)
    })
  }, [pathname, resetPath])

  return null
}
