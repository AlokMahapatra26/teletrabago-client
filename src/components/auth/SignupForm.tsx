'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiRequest } from '@/lib/api';

export function SignupForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setInfo('');

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const full_name = formData.get('full_name') as string;

    try {
      const data = await apiRequest('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email, password, full_name }),
      });

      // Show info message about email confirmation
      setInfo(data.message || 'Please check your email to confirm your account.');
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="space-y-3">
        <Label htmlFor="full_name" className="text-base font-medium">Full Name</Label>
        <Input
          id="full_name"
          name="full_name"
          type="text"
          placeholder="John Doe"
          required
          className="h-14 text-base bg-background/80 backdrop-blur border-input focus:border-ring focus:ring-2 transition"
        />
      </div>

      <div className="space-y-3">
        <Label htmlFor="email" className="text-base font-medium">Email address</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="you@example.com"
          required
          className="h-14 text-base bg-background/80 backdrop-blur border-input focus:border-ring focus:ring-2 transition"
        />
      </div>

      <div className="space-y-3">
        <Label htmlFor="password" className="text-base font-medium">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="Create a strong password"
          required
          className="h-14 text-base bg-background/80 backdrop-blur border-input focus:border-ring focus:ring-2 transition"
        />
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
          <p className="text-destructive">{error}</p>
        </div>
      )}

      {info && (
        <div className="p-4 bg-primary/10 border border-primary rounded-lg">
          <p className="text-primary">{info}</p>
        </div>
      )}

      <Button
        type="submit"
        className="w-full h-14 bg-foreground text-background font-medium shadow-lg hover:shadow-xl transition duration-300"
        disabled={loading}
      >
        {loading ? 'Creating account...' : 'Create account'}
      </Button>
    </form>
  );
}
