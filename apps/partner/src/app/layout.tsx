import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { ClerkProvider } from "@clerk/nextjs"
import { Toaster } from "sonner"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
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
          colorBackground: "#18181b",
          colorInputBackground: "#09090b",
          colorInputText: "#fafafa",
          colorText: "#fafafa",
          colorTextSecondary: "#a1a1aa",
          colorPrimary: "#3b82f6",
          colorDanger: "#ef4444",
          borderRadius: "0.5rem",
          fontFamily: "Inter, sans-serif",
        },
        elements: {
          card: "bg-zinc-900 border border-zinc-800 shadow-2xl",
          headerTitle: "text-white",
          headerSubtitle: "text-zinc-400",
          formFieldInput:
            "bg-zinc-950 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-blue-500 focus:ring-blue-500",
          formButtonPrimary:
            "bg-blue-600 hover:bg-blue-700 text-white font-medium",
          footerActionLink: "text-blue-400 hover:text-blue-300",
          socialButtonsBlockButton:
            "bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700",
          dividerLine: "bg-zinc-700",
          dividerText: "text-zinc-500",
        },
      }}
    >
      <html lang="en" className={inter.variable} suppressHydrationWarning>
        <body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased font-sans">
          {children}
          <Toaster
            position="bottom-right"
            theme="dark"
            toastOptions={{
              style: {
                background: "#18181b",
                border: "1px solid #27272a",
                color: "#fafafa",
              },
            }}
          />
        </body>
      </html>
    </ClerkProvider>
  )
}
