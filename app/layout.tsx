import "./globals.css"
import type { Metadata } from "next"
import { Urbanist } from "next/font/google"
import type React from "react" // Import React
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import ConditionalLayout from "./components/ConditionalLayout"
import { cn } from "@/lib/utils"
import Header from "./components/Header"
import Footer from "./components/Footer"

const urbanist = Urbanist({ subsets: ["latin"], variable: "--font-sans" })

export const metadata: Metadata = {
  title: {
    default: "Top100 Africa Future Leaders",
    template: "%s | Top100 Africa Future Leaders",
  },
  description:
    "Celebrating Africa's Future Leaders - Top100 Africa Future Leaders spotlighted students turning ideas into impact across the continent.",
  keywords: ["Africa", "leadership", "young leaders", "innovation", "education"],
  generator: 'v0.app',
  openGraph: {
    title: "Top100 Africa Future Leaders",
    description:
      "Celebrating Africa's Future Leaders - Top100 Africa Future Leaders spotlighted students turning ideas into impact across the continent.",
    url: "https://www.top100afl.org",
    siteName: "Top100 Africa Future Leaders",
    images: [
      {
        url: "/top100-africa-future-leaders-2024-magazine-cover-w.jpg",
        width: 1200,
        height: 630,
        alt: "Top100 Africa Future Leaders",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Top100 Africa Future Leaders",
    description:
      "Celebrating Africa's Future Leaders - Top100 Africa Future Leaders spotlighted students turning ideas into impact across the continent.",
    images: ["/top100-africa-future-leaders-2024-magazine-cover-w.jpg"],
  },
  icons: {
    icon: "/Top100 Africa Future leaders Logo .png",
    shortcut: "/favicon-16x16.png",
    other: {
      rel: "apple-touch-icon",
      url: "/apple-touch-icon.png",
    },
  },
  manifest: "/site.webmanifest",
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
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <ConditionalLayout>
            {children}
          </ConditionalLayout>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
