import "./globals.css"
import type { Metadata } from "next"
import { Urbanist } from "next/font/google"
import type React from "react" // Import React
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import Header from "./components/Header"
import Footer from "./components/Footer"
import { cn } from "@/lib/utils"

const urbanist = Urbanist({ subsets: ["latin"], variable: "--font-sans" })

export const metadata: Metadata = {
  title: "Top100 Africa Future Leaders - 2024",
  description:
    "Celebrating Africa's Future Leaders - Top100 Africa Future Leaders 2024 spotlighted students turning ideas into impact across the continent.",
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          `${urbanist.variable} ${urbanist.className}`,
          "bg-background text-foreground antialiased transition-colors duration-300"
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Header />
          <main className="min-h-[calc(100vh-120px)] transition-colors duration-300">
            {children}
          </main>
          <Footer />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
