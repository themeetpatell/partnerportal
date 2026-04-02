import { PartnerClerkProvider } from "@/components/partner-clerk-provider"

export default function SignInLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <PartnerClerkProvider>{children}</PartnerClerkProvider>
}
