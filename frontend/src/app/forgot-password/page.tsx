'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AuroraBackground } from '@/components/ui/aurora-background';
import { Bell, ArrowLeft } from 'lucide-react';
import { useState } from 'react';

const schema = z.object({
  email: z.string().email('Invalid email'),
});
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setServerError('');
    try {
      await authApi.forgotPassword(data.email);
      setSent(true);
    } catch {
      setServerError('Something went wrong. Please try again.');
    }
  }

  return (
    <AuroraBackground className="min-h-screen px-4" showRadialGradient>
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <div className="flex items-center gap-2 mb-2">
            <Bell className="h-7 w-7 text-orange-400" />
            <span className="text-2xl font-bold text-gray-900 dark:text-white">Strategi</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-white/50">GEO Analytics Platform</p>
        </div>

        <div className="rounded-xl border border-white/20 bg-white/10 backdrop-blur-xl p-8 shadow-2xl dark:border-white/10 dark:bg-white/5">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20 mx-auto">
                <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Check your email</h1>
              <p className="text-sm text-gray-500 dark:text-white/60">
                If that email is registered, we sent a password reset link. Check your inbox (and spam folder).
              </p>
              <Link href="/login">
                <Button variant="secondary" className="w-full mt-2">Back to sign in</Button>
              </Link>
            </div>
          ) : (
            <>
              <h1 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">Reset your password</h1>
              <p className="mb-6 text-sm text-gray-500 dark:text-white/60">
                Enter your email and we&apos;ll send you a reset link.
              </p>

              {serverError && (
                <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:border-red-500/30 dark:text-red-400">
                  {serverError}
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Input
                  label="Email"
                  type="email"
                  placeholder="you@company.com"
                  error={errors.email?.message}
                  {...register('email')}
                />
                <Button type="submit" className="w-full" loading={isSubmitting}>
                  Send reset link
                </Button>
              </form>
            </>
          )}
        </div>

        {!sent && (
          <p className="mt-4 text-center text-sm text-gray-500 dark:text-white/50">
            <Link href="/login" className="inline-flex items-center gap-1 font-medium text-orange-500 hover:text-orange-500 dark:text-orange-400 dark:hover:text-orange-300">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
            </Link>
          </p>
        )}
      </div>
    </AuroraBackground>
  );
}
