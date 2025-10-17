import Link from 'next/link';
import { BookOpen, LayoutDashboard, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="border-b border-zinc-800">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-orange-400" />
              <span className="text-xl font-bold">My Blog</span>
            </div>
            <nav className="flex items-center gap-4">
              <Button variant="ghost" asChild>
                <Link href="/dashboard">
                  <LayoutDashboard className="h-4 w-4 mr-2" />
                  Dashboard
                </Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link href="/dashboard/blog">
                  <FileText className="h-4 w-4 mr-2" />
                  All Posts
                </Link>
              </Button>
            </nav>
          </div>
        </div>
      </div>
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}