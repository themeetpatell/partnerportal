import type { Metadata } from "next"
import { Manrope, Space_Grotesk } from "next/font/google"
import { ClerkProvider } from "@clerk/nextjs"
import { Toaster } from "sonner"
import "./globals.css"

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
})

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
})

export const metadata: Metadata = {
  title: {
    default: "Finanshels Partner Portal",
    template: "%s | Finanshels Partner Portal",
  },
  description:
    "The official partner portal for Finanshels — manage leads, commissions, and client service requests.",
  robots: {
    index: false,
    follow: false,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorBackground: "#0b1629",
          colorInputBackground: "#08111f",
          colorInputText: "#f3f8fc",
          colorText: "#f3f8fc",
          colorTextSecondary: "#9ab0c7",
          colorPrimary: "#58d5c4",
          colorDanger: "#ff7b78",
          borderRadius: "1rem",
          fontFamily: "Manrope, sans-serif",
        },
        elements: {
          card: "border border-white/10 shadow-2xl backdrop-blur-xl",
          headerTitle: "text-white",
          headerSubtitle: "text-slate-300",
          formFieldInput:
            "border-white/10 bg-[#08111f] text-white placeholder:text-slate-500 focus:border-[#58d5c4] focus:ring-[#58d5c4]",
          formButtonPrimary:
            "bg-[#58d5c4] hover:bg-[#73ead8] text-[#08111f] font-semibold",
          footerActionLink: "text-[#8ce7db] hover:text-[#b5f4eb]",
          socialButtonsBlockButton:
            "border-white/10 bg-white/5 text-white hover:bg-white/10",
          dividerLine: "bg-white/10",
          dividerText: "text-slate-500",
        },
      }}
    >
      <html
        lang="en"
        className={`${manrope.variable} ${spaceGrotesk.variable}`}
        suppressHydrationWarning
      >
        <body className="min-h-screen font-sans text-white antialiased">
          {children}
          <Toaster
            position="bottom-right"
            theme="dark"
            toastOptions={{
              style: {
                background: "rgba(10, 20, 37, 0.94)",
                border: "1px solid rgba(152, 182, 216, 0.14)",
                color: "#f3f8fc",
                backdropFilter: "blur(20px)",
              },
            }}
          />
        </body>
      </html>
    </ClerkProvider>
  )
}
