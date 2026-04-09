import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Toaster } from "sonner"
import { ThemeProvider } from "@/components/theme-provider"
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
    icon: [{ url: "/brand-mark.png", type: "image/png" }],
    shortcut: "/brand-mark.png",
    apple: "/brand-mark.png",
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
      <body className="min-h-screen font-sans text-foreground antialiased">
        <ThemeProvider>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              classNames: {
                toast:
                  "!bg-card !border-border !text-foreground !shadow-lg backdrop-blur-xl",
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  )
}
