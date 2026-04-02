import type { Metadata } from "next"
import { Inter } from "next/font/google"
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
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
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
  )
}
