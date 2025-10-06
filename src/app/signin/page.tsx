'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SigninForm } from '@/components/auth/SigninForm';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

export default function SigninPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin border-4 border-solid border-muted border-r-foreground"></div>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return (
    <main className="relative h-screen bg-background flex">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-muted/20 to-background" />

      {/* Decorative Elements */}
      <div className="absolute top-20 right-20 w-96 h-96 bg-muted/40 rounded-full blur-3xl opacity-40" />
      <div className="absolute bottom-20 left-20 w-[500px] h-[500px] bg-muted/40 rounded-full blur-3xl opacity-40" />

      {/* Back to Home Link */}
      <Link 
        href="/" 
        className="absolute top-8 left-8 text-2xl font-bold tracking-tight hover:opacity-70 transition-opacity z-10"
      >
        Teletrabago
      </Link>

      {/* Left Side - Empty space with subtle shade */}
      <div className="flex-1 relative bg-gradient-to-r from-muted/10 to-transparent" />

      {/* Right Side - Form Area with subtle background */}
      <div className="flex-1 relative z-10 flex items-center justify-center bg-gradient-to-l from-muted/20 to-transparent px-20">
        <div className="w-full max-w-xl space-y-12">
          {/* Header */}
          <div className="space-y-4">
            <h1 className="text-6xl font-bold tracking-tight">Welcome back</h1>
            <p className="text-xl text-muted-foreground">
              Sign in to your account to continue
            </p>
          </div>

          {/* Form Component */}
          <SigninForm />

          {/* Footer */}
          <p className="text-center text-base text-muted-foreground">
            Don't have an account?{' '}
            <Link 
              href="/signup" 
              className="font-semibold text-foreground hover:underline"
            >
              Sign up for free
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
