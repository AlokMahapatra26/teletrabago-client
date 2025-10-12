'use client';

import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';

export default function ForgotPasswordPage() {
  return (
    <main className="flex items-center justify-center min-h-screen  p-4">
      <div className="w-full max-w-md rounded-md  p-6 shadow-md">
        <h1 className="text-2xl font-semibold mb-6">Reset your password</h1>
        <ForgotPasswordForm />
      </div>
    </main>
  );
}
