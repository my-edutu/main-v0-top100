import type { Metadata } from 'next';
import { ThemeProvider } from '@/components/theme-provider';
import { cn } from '@/lib/utils';
import { Urbanist } from 'next/font/google';
import '../globals.css';
import { Toaster } from '@/components/ui/sonner';

const urbanist = Urbanist({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'Top100 Africa Future Leaders',
  description: 'Celebrating Africa\'s Future Leaders',
};

export default function StandaloneLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={cn(
          `${urbanist.variable} ${urbanist.className}`,
          'bg-background text-foreground antialiased transition-colors duration-300'
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}