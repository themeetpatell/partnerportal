import { PartnerClerkProvider } from "@/components/partner-clerk-provider"

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <PartnerClerkProvider>{children}</PartnerClerkProvider>
}
