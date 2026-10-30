'use client';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, LogIn, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface LoginFormProps {
  onSwitchToRegister: () => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginForm({ onSwitchToRegister }: LoginFormProps) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<LoginFormData>({
    defaultValues: { rememberMe: false },
  });

  const onSubmit = async (data: LoginFormData) => {
    setServerError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email, password: data.password }),
      });

      const result = await res.json().catch(() => null);

      if (!res.ok) {
        setIsLoading(false);
        setServerError(result?.message || 'Invalid email or password');
        return;
      }

      const role = result?.data?.role;
      toast.success('Signed in successfully!');
      setIsLoading(false);

      if (role === 'donor') {
        router.push('/donor-dashboard');
      } else if (role === 'requester') {
        router.push('/find-blood-search');
      } else {
        router.push('/donor-dashboard');
      }
    } catch {
      setIsLoading(false);
      setServerError('An error occurred during sign in. Please try again.');
    }
  };

  const handleForgotPassword = async () => {
    const email = getValues('email')?.trim();

    if (!email) {
      toast.error('Please enter your email address above before resetting your password.');
      return;
    }

    if (!EMAIL_REGEX.test(email)) {
      toast.error('Please enter a valid email address before resetting your password.');
      return;
    }

    setIsResetting(true);

    try {
      const supabase = createClient();
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
      });

      if (error) {
        toast.error(error.message || 'Unable to send reset email. Please try again.');
      } else {
        // Always show the same message for security — don't reveal if the account exists
        toast.success(
          'If an account exists with that email, a password reset link has been sent. Please check your inbox.'
        );
      }
    } catch {
      toast.error('Something went wrong. Please try again later.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="fade-in">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">Welcome back</h2>
        <p className="text-sm text-muted-foreground mt-1">Sign in to your BloodConnect account</p>
      </div>

      {/* Server error */}
      {serverError && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-error-bg border border-red-200 mb-4 fade-in">
          <AlertCircle size={15} className="text-error flex-shrink-0 mt-0.5" />
          <p className="text-sm text-error">{serverError}</p>
        </div>
      )}

      {/* Email */}
      <div className="mb-4">
        <label htmlFor="login-email" className="block text-sm font-semibold text-foreground mb-1.5">
          Email Address
        </label>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          className={`input-field ${errors.email ? 'error' : ''}`}
          {...register('email', {
            required: 'Email is required',
            pattern: {
              value: EMAIL_REGEX,
              message: 'Enter a valid email address',
            },
          })}
        />
        {errors.email && (
          <p className="text-xs text-error mt-1.5 flex items-center gap-1">
            <AlertCircle size={11} />
            {errors.email.message}
          </p>
        )}
      </div>

      {/* Password */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor="login-password" className="text-sm font-semibold text-foreground">
            Password
          </label>
          <button
            type="button"
            onClick={handleForgotPassword}
            disabled={isResetting}
            className="text-xs text-primary font-semibold hover:underline disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isResetting ? 'Sending…' : 'Forgot password?'}
          </button>
        </div>
        <div className="relative">
          <input
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="Enter your password"
            className={`input-field pr-10 ${errors.password ? 'error' : ''}`}
            {...register('password', {
              required: 'Password is required',
              minLength: { value: 6, message: 'Password must be at least 6 characters' },
            })}
          />
          <button
            type="button"
            onClick={() => setShowPassword((p) => !p)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {errors.password && (
          <p className="text-xs text-error mt-1.5 flex items-center gap-1">
            <AlertCircle size={11} />
            {errors.password.message}
          </p>
        )}
      </div>

      {/* Remember me */}
      <div className="flex items-center gap-2 mb-5">
        <input
          id="remember-me"
          type="checkbox"
          className="w-4 h-4 rounded border-border text-primary accent-primary"
          {...register('rememberMe')}
        />
        <label htmlFor="remember-me" className="text-sm text-muted-foreground">
          Remember me for 30 days
        </label>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading}
        className="btn-primary w-full py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
        style={{ minWidth: '100%' }}
      >
        {isLoading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Signing in…
          </>
        ) : (
          <>
            <LogIn size={16} />
            Sign In
          </>
        )}
      </button>

      <p className="text-center text-sm text-muted-foreground mt-4">
        Don&apos;t have an account?{' '}
        <button
          type="button"
          onClick={onSwitchToRegister}
          className="text-primary font-semibold hover:underline"
        >
          Create one
        </button>
      </p>

      {/* Medical disclaimer */}
      <div className="mt-4 p-3 rounded-xl bg-warning-bg border border-amber-200">
        <p className="text-xs text-warning leading-relaxed">
          <strong>Medical Disclaimer:</strong> BloodConnect does not provide medical advice. All
          blood compatibility and donor eligibility decisions must be confirmed by qualified medical
          staff. Emergency? Call 112.
        </p>
      </div>
    </form>
  );
}
