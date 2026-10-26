import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Top100 AFL Team',
    template: '%s · Top100 AFL Team',
  },
  description: 'Internal team management for Top100 Africa Future Leaders.',
  robots: { index: false, follow: false },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="grain font-sans antialiased">{children}</body>
    </html>
  )
}
