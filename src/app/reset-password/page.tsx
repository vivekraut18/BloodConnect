'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import AppLogo from '@/components/ui/AppLogo';

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [sessionValid, setSessionValid] = useState<boolean | null>(null);

  // Field-level validation errors
  const [fieldErrors, setFieldErrors] = useState<{
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  // Verify that a valid recovery session exists
  useEffect(() => {
    async function checkSession() {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        setSessionValid(false);
        return;
      }

      setSessionValid(true);
    }

    checkSession();
  }, [supabase]);

  function validate(): boolean {
    const errors: { newPassword?: string; confirmPassword?: string } = {};

    if (!newPassword) {
      errors.newPassword = 'New password is required';
    } else if (newPassword.length < 6) {
      errors.newPassword = 'Password must be at least 6 characters';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (newPassword !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) {
        toast.error(error.message || 'Failed to update password. Please try again.');
        setIsSubmitting(false);
        return;
      }

      setIsSuccess(true);
      toast.success('Password updated successfully!');

      // Sign out so the user can log in with their new password
      await supabase.auth.signOut();

      // Redirect to login after a short delay
      setTimeout(() => {
        router.push('/');
      }, 2000);
    } catch {
      toast.error('Something went wrong. Please try again later.');
      setIsSubmitting(false);
    }
  };

  // Loading state while verifying session
  if (sessionValid === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center fade-in">
          <Loader2 size={32} className="animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Verifying your reset link…</p>
        </div>
      </div>
    );
  }

  // Invalid / expired session
  if (!sessionValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-5">
        <div className="w-full max-w-md text-center fade-in">
          <div className="flex justify-center mb-4">
            <AppLogo size={40} />
          </div>
          <div className="p-6 rounded-2xl bg-card border border-border shadow-sm">
            <div className="flex items-center justify-center gap-2 mb-3">
              <AlertCircle size={20} className="text-error" />
              <h2 className="text-xl font-bold text-foreground">Invalid or Expired Link</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
              This password reset link has expired or is no longer valid.
              Please request a new reset link from the login page.
            </p>
            <button
              onClick={() => router.push('/')}
              className="btn-primary w-full py-2.5 rounded-xl font-semibold text-sm"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-5">
        <div className="w-full max-w-md text-center fade-in">
          <div className="flex justify-center mb-4">
            <AppLogo size={40} />
          </div>
          <div className="p-6 rounded-2xl bg-card border border-border shadow-sm">
            <div className="flex items-center justify-center gap-2 mb-3">
              <CheckCircle2 size={24} className="text-success" />
              <h2 className="text-xl font-bold text-foreground">Password Updated</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
              Your password has been updated successfully. Redirecting you to the login page…
            </p>
            <Loader2 size={20} className="animate-spin text-primary mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  // Reset form
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-5">
      <div className="w-full max-w-md fade-in">
        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-2">
            <AppLogo size={36} />
            <span className="text-lg font-bold text-foreground">BloodConnect</span>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-card border border-border shadow-sm">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck size={18} className="text-primary" />
              <h2 className="text-2xl font-bold text-foreground">Reset Password</h2>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Enter your new password below. It must be at least 6 characters.
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            {/* New password */}
            <div className="mb-4">
              <label
                htmlFor="new-password"
                className="block text-sm font-semibold text-foreground mb-1.5"
              >
                New Password
              </label>
              <div className="relative">
                <input
                  id="new-password"
                  type={showNew ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (fieldErrors.newPassword) {
                      setFieldErrors((prev) => ({ ...prev, newPassword: undefined }));
                    }
                  }}
                  className={`input-field pr-10 ${fieldErrors.newPassword ? 'error' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowNew((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showNew ? 'Hide password' : 'Show password'}
                >
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {fieldErrors.newPassword && (
                <p className="text-xs text-error mt-1.5 flex items-center gap-1">
                  <AlertCircle size={11} />
                  {fieldErrors.newPassword}
                </p>
              )}
            </div>

            {/* Confirm password */}
            <div className="mb-5">
              <label
                htmlFor="confirm-password"
                className="block text-sm font-semibold text-foreground mb-1.5"
              >
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirm-password"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (fieldErrors.confirmPassword) {
                      setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                    }
                  }}
                  className={`input-field pr-10 ${fieldErrors.confirmPassword ? 'error' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <p className="text-xs text-error mt-1.5 flex items-center gap-1">
                  <AlertCircle size={11} />
                  {fieldErrors.confirmPassword}
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Updating password…
                </>
              ) : (
                <>
                  <ShieldCheck size={16} />
                  Update Password
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-4">
            Remember your password?{' '}
            <button
              type="button"
              onClick={() => router.push('/')}
              className="text-primary font-semibold hover:underline"
            >
              Back to Login
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
