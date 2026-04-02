import { PartnerClerkProvider } from "@/components/partner-clerk-provider"

export default function SignUpLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <PartnerClerkProvider>{children}</PartnerClerkProvider>
}
