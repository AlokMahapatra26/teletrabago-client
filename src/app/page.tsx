'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import LandingPage from '@/components/landing-page/landingPage';
import Loading from '@/components/loading/Loading';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading]);

  if (isLoading) {
    return (
      <Loading/>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return (
    <LandingPage/>
  );
}
