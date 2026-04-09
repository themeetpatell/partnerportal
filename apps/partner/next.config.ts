import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  poweredByHeader: false,
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
