'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
export default function Header() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [isScrolled, setIsScrolled] = useState(false);
  useEffect(() => { const onScroll = () => setIsScrolled(window.scrollY > 10); window.addEventListener('scroll', onScroll); return () => window.removeEventListener('scroll', onScroll); }, []);
  return (
    <header className={`fixed w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-black/90 backdrop-blur-lg' : 'bg-transparent'}`}>
      <div className="container mx-auto px-4 lg:px-6 py-4 flex justify-between items-center max-w-7xl">
        <div className="font-semibold">Top100</div>
        <nav className="hidden md:flex gap-6 items-center">
          <Link href="/blog">Blog</Link><Link href="/about">About</Link>
          {!isPending && (session ? (
            <button onClick={() => authClient.signOut()}>Sign out</button>
          ) : (
            <button onClick={() => router.push('/sign-in')}>Sign in</button>
          ))}
        </nav>
      </div>
    </header>
  );
}