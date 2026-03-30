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
    default: "Finanshels Admin",
    template: "%s | Finanshels Admin",
  },
  description: "Internal admin portal for Finanshels team.",
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
          colorBackground: "#050505",
          colorInputBackground: "#050505",
          colorInputText: "#f5f5f5",
          colorText: "#f5f5f5",
          colorTextSecondary: "#b3b3b3",
          colorPrimary: "#818cf8",
          colorDanger: "#ff7b78",
          borderRadius: "1rem",
          fontFamily: "Inter, sans-serif",
        },
        elements: {
          card: "border border-white/10 shadow-2xl backdrop-blur-xl",
          headerTitle: "text-white",
          headerSubtitle: "text-slate-300",
          formFieldInput:
            "border-white/10 bg-[#050505] text-white placeholder:text-slate-500 focus:border-indigo-400 focus:ring-indigo-400",
          formButtonPrimary:
            "bg-indigo-400 hover:bg-indigo-500 text-white font-semibold",
          footerActionLink: "text-indigo-400 hover:text-indigo-300",
          socialButtonsBlockButton:
            "border-white/10 bg-white/5 text-white hover:bg-white/10",
          dividerLine: "bg-white/10",
          dividerText: "text-slate-500",
        },
      }}
    >
      <html lang="en" className={inter.variable} suppressHydrationWarning>
        <body className="min-h-screen text-white antialiased font-sans">
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
