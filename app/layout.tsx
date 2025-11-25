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
import Script from "next/script"
import StructuredData from "@/components/StructuredData"

const urbanist = Urbanist({ subsets: ["latin"], variable: "--font-sans" })

export const metadata: Metadata = {
  title: {
    default: "Top100 Africa Future Leaders | Celebrating Africa's Youth Innovation & Leadership",
    template: "%s | Top100 Africa Future Leaders",
  },
  description:
    "Discover 10,000+ exceptional African youth leaders, innovators, and changemakers. Access scholarships, leadership summits, and opportunities across the continent. Celebrating excellence from Lagos to Kigali.",
  keywords: [
    "Africa",
    "leadership",
    "young leaders",
    "innovation",
    "education",
    "African youth leaders",
    "African scholarships 2025",
    "African student leadership programs",
    "Future Leaders Summit Africa",
    "Top100 Africa",
    "African innovation hub",
    "Youth opportunities Africa",
    "African changemakers",
    "African first-class graduates",
    "Student leadership Africa",
    "Nigeria youth leaders",
    "Kenya scholarships",
    "African awards",
    "Youth empowerment Africa"
  ],
  generator: 'v0.app',
  metadataBase: new URL('https://www.top100afl.org'),
  openGraph: {
    title: "Top100 Africa Future Leaders | Celebrating Africa's Youth Innovation & Leadership",
    description:
      "Discover 10,000+ exceptional African youth leaders, innovators, and changemakers. Access scholarships, leadership summits, and opportunities across the continent.",
    url: "https://www.top100afl.org",
    siteName: "Top100 Africa Future Leaders",
    images: [
      {
        url: "/top100-africa-future-leaders-2024-magazine-cover-w.jpg",
        width: 1200,
        height: 630,
        alt: "Top100 Africa Future Leaders - Celebrating exceptional African youth leaders and changemakers",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Top100 Africa Future Leaders | Celebrating Africa's Youth Innovation & Leadership",
    description:
      "Discover 10,000+ exceptional African youth leaders, innovators, and changemakers. Access scholarships, leadership summits, and opportunities across the continent.",
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
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Top100 Africa Future Leaders",
    "alternateName": "Top100 AFL",
    "url": "https://www.top100afl.org",
    "logo": "https://www.top100afl.org/Top100 Africa Future leaders Logo .png",
    "description": "Celebrating Africa's Future Leaders - identifying, empowering, and celebrating 10,000 youth leaders across Africa by 2030. We spotlight exceptional students turning ideas into impact across the continent.",
    "foundingDate": "2024",
    "keywords": "African youth leaders, African scholarships, leadership development Africa, African innovation, student leadership, youth empowerment",
    "areaServed": {
      "@type": "Place",
      "name": "Africa"
    },
    "sameAs": [
      // Add your social media URLs here when available
    ],
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "General Inquiries",
      "areaServed": "Africa",
      "availableLanguage": "English"
    }
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <StructuredData data={organizationSchema} />
        <Script
          id="brevo-sdk"
          src="https://cdn.brevo.com/js/sdk-loader.js"
          strategy="afterInteractive"
        />
        <Script
          id="brevo-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined' && window.Brevo) {
                window.Brevo = window.Brevo || [];
                window.Brevo.push(['init', {
                  client_key: '${process.env.NEXT_PUBLIC_BREVO_CLIENT_KEY || ''}'
                }]);
              }
            `,
          }}
        />
      </head>
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
