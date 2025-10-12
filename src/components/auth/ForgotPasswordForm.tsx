'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase'; 

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`, // redirect on reset
    });

    if (error) {
      setMessage(`Error: ${error.message}`);
    } else {
      setMessage('If your email is registered, you will receive a reset link shortly.');
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {message && <p className="text-sm text-muted-foreground">{message}</p>}

      <label htmlFor="email" className="block font-medium text-sm mb-1">Email address</label>
      <Input
        id="email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        disabled={loading}
        autoComplete="email"
        placeholder="Enter your email"
      />

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Sending...' : 'Send reset link'}
      </Button>
    </form>
  );
}
