import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: [
    "@repo/ui",
    "@repo/auth",
    "@repo/db",
    "@repo/types",
    "@repo/commission-engine",
    "@repo/notifications",
    "@repo/zoho",
  ],
}

export default nextConfig
