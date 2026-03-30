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
    "The official partner portal for Finanshels — manage clients, commissions, and service requests.",
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
      <html
        lang="en"
        className={inter.variable}
        suppressHydrationWarning
      >
        <body className="min-h-screen font-sans text-white antialiased">
          {children}
          <Toaster
            position="bottom-right"
            theme="dark"
            toastOptions={{
              style: {
                background: "rgba(10, 10, 10, 0.94)",
                border: "1px solid rgba(255, 255, 255, 0.14)",
                color: "#f5f5f5",
                backdropFilter: "blur(20px)",
              },
            }}
          />
        </body>
      </html>
    </ClerkProvider>
  )
}
