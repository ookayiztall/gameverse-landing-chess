import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import "./globals.css"
import "react-toastify/dist/ReactToastify.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "GameVerse | Private Gaming Platform",
  description: "Join the next generation gaming platform - play, compete, and connect with family and friends",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/gameverse-favicon.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/gameverse-favicon.png",
        media: "(prefers-color-scheme: dark)",
      },
    ],
    apple: "/gameverse-favicon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const enableAnalytics = process.env.VERCEL === "1"

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans antialiased`} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          {children}
          <Toaster />
        </ThemeProvider>
        {enableAnalytics ? <Analytics /> : null}
      </body>
    </html>
  )
}
