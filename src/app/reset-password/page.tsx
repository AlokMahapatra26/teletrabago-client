'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function parseHashParams(hash: string) {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  return {
    access_token: params.get('access_token'),
    refresh_token: params.get('refresh_token'),
  };
}

export default function ResetPasswordPage() {
  const router = useRouter();

  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const { access_token, refresh_token } = parseHashParams(window.location.hash);
    console.log('Tokens from URL hash:', { access_token, refresh_token });

    if (access_token && refresh_token) {
      setAccessToken(access_token);
      setRefreshToken(refresh_token);

      supabase.auth
        .setSession({
          access_token,
          refresh_token,
        })
        .catch(console.error);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setMessage(null);

    if (!accessToken || !refreshToken) {
      setMessage('Invalid or missing access token.');
      return;
    }

    if (password.length < 6) {
      setMessage('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setMessage(`Error: ${error.message}`);
      } else {
        setMessage('Password updated successfully! Redirecting to login...');
        setTimeout(() => router.push('/signin'), 3000);
      }
    } catch (err) {
      setMessage('Unexpected error occurred.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="max-w-md w-full rounded-md  p-6 shadow-lg">
        <h1 className="text-2xl font-semibold mb-6">Reset Password</h1>

        {message && (
          <p className="mb-4 text-center text-sm text-muted-foreground">{message}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" value={accessToken ?? ''} readOnly />
          <input type="hidden" value={refreshToken ?? ''} readOnly />

          <div>
            <label htmlFor="password" className="block mb-1 font-medium">
              New Password
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              minLength={6}
              required
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoComplete="new-password"
              placeholder="Enter new password"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block mb-1 font-medium">
              Confirm Password
            </label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              minLength={6}
              required
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              autoComplete="new-password"
              placeholder="Confirm new password"
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Resetting...' : 'Reset Password'}
          </Button>
        </form>
      </div>
    </main>
  );
}
