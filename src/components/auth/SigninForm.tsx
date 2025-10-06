'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiRequest } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export function SigninForm() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      const data = await apiRequest('/api/auth/signin', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      setAuth(data.user, data.session.access_token);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="space-y-3">
        <Label htmlFor="email" className="text-base font-medium">
          Email address
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="you@example.com"
          required
          className="h-14 text-base bg-white/80 backdrop-blur border-gray-300 focus:border-black focus:ring-2 focus:ring-black transition-all"
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="password" className="text-base font-medium">
            Password
          </Label>
          <Link 
            href="/forgot-password" 
            className="text-sm text-gray-600 hover:text-black transition-colors"
          >
            Forgot password?
          </Link>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="Enter your password"
          required
          className="h-14 text-base bg-white/80 backdrop-blur border-gray-300 focus:border-black focus:ring-2 focus:ring-black transition-all"
        />
      </div>

      {error && (
        <div className="p-4 bg-red-50 rounded-lg">
          <p className="text-base text-red-600">{error}</p>
        </div>
      )}

      <Button 
        type="submit" 
        className="w-full h-14 bg-black text-white hover:bg-gray-800 font-medium text-base shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] mt-4" 
        disabled={loading}
      >
        {loading ? 'Signing in...' : 'Sign in'}
      </Button>
    </form>
  );
}
