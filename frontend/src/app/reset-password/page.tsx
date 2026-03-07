'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AuroraBackground } from '@/components/ui/aurora-background';
import { Zap } from 'lucide-react';
import { useState, Suspense } from 'react';

const schema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});
type FormData = z.infer<typeof schema>;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    if (!token) {
      setServerError('Invalid or missing reset token.');
      return;
    }
    setServerError('');
    try {
      await authApi.resetPassword(token, data.password);
      setSuccess(true);
      setTimeout(() => router.push('/login'), 2500);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Reset failed. The link may have expired.';
      setServerError(msg);
    }
  }

  if (!token) {
    return (
      <div className="text-center space-y-4">
        <h1 className="text-xl font-semibold dark:text-white">Invalid link</h1>
        <p className="text-sm dark:text-white/60">This reset link is invalid or has expired.</p>
        <Link href="/forgot-password">
          <Button className="w-full mt-2">Request a new link</Button>
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center space-y-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20 mx-auto">
          <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold dark:text-white">Password updated</h1>
        <p className="text-sm dark:text-white/60">Redirecting you to sign in…</p>
      </div>
    );
  }

  return (
    <>
      <h1 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">Set a new password</h1>
      <p className="mb-6 text-sm text-gray-500 dark:text-white/60">
        Choose a strong password for your account.
      </p>

      {serverError && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:border-red-500/30 dark:text-red-400">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="New password"
          type="password"
          placeholder="Min. 8 characters"
          error={errors.password?.message}
          {...register('password')}
        />
        <Input
          label="Confirm password"
          type="password"
          placeholder="Repeat password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        <Button type="submit" className="w-full" loading={isSubmitting}>
          Reset password
        </Button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuroraBackground className="min-h-screen px-4" showRadialGradient>
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-7 w-7 text-indigo-400" />
            <span className="text-2xl font-bold text-gray-900 dark:text-white">Strategi</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-white/50">GEO Analytics Platform</p>
        </div>

        <div className="rounded-xl border border-white/20 bg-white/10 backdrop-blur-xl p-8 shadow-2xl dark:border-white/10 dark:bg-white/5">
          <Suspense fallback={<p className="text-sm dark:text-white/60">Loading…</p>}>
            <ResetPasswordForm />
          </Suspense>
        </div>

        <p className="mt-4 text-center text-sm text-gray-500 dark:text-white/50">
          <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300">
            Back to sign in
          </Link>
        </p>
      </div>
    </AuroraBackground>
  );
}
