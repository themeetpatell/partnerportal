import { ClerkProvider } from "@clerk/nextjs"

export function PartnerClerkProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorBackground: "#18181b",
          colorInputBackground: "#09090b",
          colorInputText: "#fafafa",
          colorText: "#fafafa",
          colorTextSecondary: "#a1a1aa",
          colorPrimary: "#818cf8",
          colorDanger: "#ef4444",
          borderRadius: "0.625rem",
          fontFamily: "Inter, sans-serif",
        },
        elements: {
          card: "bg-zinc-900 border border-zinc-800 shadow-2xl",
          headerTitle: "text-white",
          headerSubtitle: "text-zinc-400",
          formFieldInput:
            "bg-zinc-950 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-indigo-400 focus:ring-indigo-400",
          formButtonPrimary:
            "bg-indigo-400 hover:bg-indigo-500 text-white font-semibold",
          footerActionLink: "text-indigo-400 hover:text-indigo-300",
          socialButtonsBlockButton:
            "bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700",
          dividerLine: "bg-zinc-700",
          dividerText: "text-zinc-500",
        },
      }}
    >
      {children}
    </ClerkProvider>
  )
}
