'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the actual signin page
    router.push('/auth/signin');
  }, [router]);

  return null; // Render nothing since we're redirecting
}