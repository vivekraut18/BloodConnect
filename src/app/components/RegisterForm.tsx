'use client';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, AlertCircle, Loader2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { BLOOD_GROUPS, HOSPITAL_TYPES } from '@/lib/constants';

type UserRole = 'donor' | 'requester' | 'hospital' | 'admin';

interface RegisterFormData {
  role: UserRole;
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  // Donor-specific
  bloodGroup?: string;
  dob?: string;
  city?: string;
  // Hospital-specific
  hospitalName?: string;
  hospitalType?: string;
  registrationNumber?: string;
  // Consent
  consentMedical: boolean;
  consentTerms: boolean;
}

interface RegisterFormProps {
  onSwitchToLogin: () => void;
}

const ROLE_OPTIONS: { value: UserRole; label: string; description: string }[] = [
  { value: 'donor', label: 'Blood Donor', description: 'Donate blood and respond to requests' },
  { value: 'requester', label: 'Patient / Family', description: 'Find blood for a patient' },
  { value: 'hospital', label: 'Hospital / Blood Bank', description: 'Manage inventory and requests' },
];

export default function RegisterForm({ onSwitchToLogin }: RegisterFormProps) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegisterFormData>({
    defaultValues: { role: 'donor', consentMedical: false, consentTerms: false },
  });

  const selectedRole = watch('role');
  const password = watch('password');

  const onSubmit = async (_data: RegisterFormData) => {
    setIsLoading(true);
    // BACKEND INTEGRATION: POST /api/auth/register — Argon2id hashing server-side, rate limited
    await new Promise((r) => setTimeout(r, 1400));
    toast.success('Account created! Please verify your email to continue.');
    setIsLoading(false);
    if (_data.role === 'donor') router.push('/donor-dashboard');
    else router.push('/find-blood-search');
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="fade-in">
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-foreground">Create account</h2>
        <p className="text-sm text-muted-foreground mt-1">Join BloodConnect and help save lives</p>
      </div>

      {/* Role selector */}
      <div className="mb-5">
        <label className="block text-sm font-semibold text-foreground mb-2">I am registering as</label>
        <div className="grid grid-cols-1 gap-2">
          {ROLE_OPTIONS.map((opt) => (
            <label
              key={`role-opt-${opt.value}`}
              className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all duration-150 ${
                selectedRole === opt.value
                  ? 'border-primary bg-primary-light' :'border-border hover:border-primary/40 bg-card'
              }`}
            >
              <input
                type="radio"
                value={opt.value}
                className="mt-0.5 accent-primary"
                {...register('role')}
              />
              <div>
                <p className={`text-sm font-semibold ${selectedRole === opt.value ? 'text-primary' : 'text-foreground'}`}>
                  {opt.label}
                </p>
                <p className="text-xs text-muted-foreground">{opt.description}</p>
              </div>
            </label>
          ))}
        </div>
        {selectedRole === 'hospital' && (
          <p className="text-xs text-warning bg-warning-bg border border-amber-200 rounded-lg px-3 py-2 mt-2 flex items-center gap-1.5">
            <AlertCircle size={11} />
            Hospital accounts require admin verification before activation.
          </p>
        )}
      </div>

      {/* Full name */}
      <div className="mb-4">
        <label htmlFor="reg-name" className="block text-sm font-semibold text-foreground mb-1.5">
          Full Name
        </label>
        <input
          id="reg-name"
          type="text"
          placeholder="As per government ID"
          className={`input-field ${errors.fullName ? 'error' : ''}`}
          {...register('fullName', {
            required: 'Full name is required',
            minLength: { value: 2, message: 'Name must be at least 2 characters' },
          })}
        />
        {errors.fullName && (
          <p className="text-xs text-error mt-1.5 flex items-center gap-1">
            <AlertCircle size={11} />
            {errors.fullName.message}
          </p>
        )}
      </div>

      {/* Email */}
      <div className="mb-4">
        <label htmlFor="reg-email" className="block text-sm font-semibold text-foreground mb-1.5">
          Email Address
        </label>
        <input
          id="reg-email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          className={`input-field ${errors.email ? 'error' : ''}`}
          {...register('email', {
            required: 'Email is required',
            pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email' },
          })}
        />
        {errors.email && (
          <p className="text-xs text-error mt-1.5 flex items-center gap-1">
            <AlertCircle size={11} />
            {errors.email.message}
          </p>
        )}
      </div>

      {/* Phone */}
      <div className="mb-4">
        <label htmlFor="reg-phone" className="block text-sm font-semibold text-foreground mb-1.5">
          Mobile Number
        </label>
        <p className="text-xs text-muted-foreground mb-1.5">
          Used only for urgent donation alerts. Never shown publicly.
        </p>
        <div className={`flex items-center rounded-xl border bg-background overflow-hidden ${errors.phone ? 'border-error' : 'border-border'} focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary transition-all`}>
          <span className="px-3 py-2.5 text-sm font-semibold text-muted-foreground border-r border-border bg-muted/40 flex-shrink-0 select-none">
            +91
          </span>
          <input
            id="reg-phone"
            type="tel"
            placeholder="98765 43210"
            className="flex-1 px-3 py-2.5 text-sm bg-transparent outline-none border-none"
            {...register('phone', {
              required: 'Mobile number is required',
              pattern: { value: /^[6-9]\d{9}$/, message: 'Enter a valid 10-digit Indian mobile number' },
            })}
          />
        </div>
        {errors.phone && (
          <p className="text-xs text-error mt-1.5 flex items-center gap-1">
            <AlertCircle size={11} />
            {errors.phone.message}
          </p>
        )}
      </div>

      {/* Donor-specific fields */}
      {selectedRole === 'donor' && (
        <div className="mb-4 p-4 rounded-xl bg-muted/50 border border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Donor Information
          </p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label htmlFor="reg-blood-group" className="block text-sm font-semibold text-foreground mb-1.5">
                Blood Group <span className="text-error">*</span>
              </label>
              <select
                id="reg-blood-group"
                className={`input-field ${errors.bloodGroup ? 'error' : ''}`}
                {...register('bloodGroup', { required: 'Blood group is required for donors' })}
              >
                <option value="">Select</option>
                {BLOOD_GROUPS.map((bg) => (
                  <option key={`bg-opt-${bg}`} value={bg}>{bg}</option>
                ))}
              </select>
              {errors.bloodGroup && (
                <p className="text-xs text-error mt-1 flex items-center gap-1">
                  <AlertCircle size={11} />
                  {errors.bloodGroup.message}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="reg-dob" className="block text-sm font-semibold text-foreground mb-1.5">
                Date of Birth <span className="text-error">*</span>
              </label>
              <input
                id="reg-dob"
                type="date"
                className={`input-field ${errors.dob ? 'error' : ''}`}
                {...register('dob', { required: 'Date of birth is required' })}
              />
            </div>
          </div>
          <div>
            <label htmlFor="reg-city" className="block text-sm font-semibold text-foreground mb-1.5">
              City / District
            </label>
            <input
              id="reg-city"
              type="text"
              placeholder="e.g. Mumbai, Delhi, Pune"
              className="input-field"
              {...register('city')}
            />
          </div>
        </div>
      )}

      {/* Hospital-specific fields */}
      {selectedRole === 'hospital' && (
        <div className="mb-4 p-4 rounded-xl bg-muted/50 border border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Institution Details
          </p>
          <div className="mb-3">
            <label htmlFor="reg-hospital-name" className="block text-sm font-semibold text-foreground mb-1.5">
              Institution Name <span className="text-error">*</span>
            </label>
            <input
              id="reg-hospital-name"
              type="text"
              placeholder="Full registered name"
              className={`input-field ${errors.hospitalName ? 'error' : ''}`}
              {...register('hospitalName', { required: 'Institution name is required' })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="reg-hospital-type" className="block text-sm font-semibold text-foreground mb-1.5">
                Type <span className="text-error">*</span>
              </label>
              <select
                id="reg-hospital-type"
                className="input-field"
                {...register('hospitalType', { required: true })}
              >
                <option value="">Select type</option>
                {HOSPITAL_TYPES.map((ht) => (
                  <option key={`ht-${ht}`} value={ht}>{ht}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="reg-reg-number" className="block text-sm font-semibold text-foreground mb-1.5">
                Reg. Number <span className="text-error">*</span>
              </label>
              <input
                id="reg-reg-number"
                type="text"
                placeholder="MH/HOS/2024/XXXXX"
                className="input-field"
                {...register('registrationNumber', { required: true })}
              />
            </div>
          </div>
        </div>
      )}

      {/* Password */}
      <div className="mb-4">
        <label htmlFor="reg-password" className="block text-sm font-semibold text-foreground mb-1.5">
          Password
        </label>
        <p className="text-xs text-muted-foreground mb-1.5">
          Minimum 8 characters with uppercase, number, and special character.
        </p>
        <div className="relative">
          <input
            id="reg-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="Create a strong password"
            className={`input-field pr-10 ${errors.password ? 'error' : ''}`}
            {...register('password', {
              required: 'Password is required',
              minLength: { value: 8, message: 'At least 8 characters required' },
              pattern: {
                value: /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
                message: 'Must include uppercase, number, and special character',
              },
            })}
          />
          <button
            type="button"
            onClick={() => setShowPassword((p) => !p)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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

      {/* Confirm password */}
      <div className="mb-4">
        <label htmlFor="reg-confirm" className="block text-sm font-semibold text-foreground mb-1.5">
          Confirm Password
        </label>
        <div className="relative">
          <input
            id="reg-confirm"
            type={showConfirm ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="Repeat your password"
            className={`input-field pr-10 ${errors.confirmPassword ? 'error' : ''}`}
            {...register('confirmPassword', {
              required: 'Please confirm your password',
              validate: (val) => val === password || 'Passwords do not match',
            })}
          />
          <button
            type="button"
            onClick={() => setShowConfirm((p) => !p)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={showConfirm ? 'Hide password' : 'Show password'}
          >
            {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {errors.confirmPassword && (
          <p className="text-xs text-error mt-1.5 flex items-center gap-1">
            <AlertCircle size={11} />
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      {/* Medical consent */}
      <div className="mb-3 p-3.5 rounded-xl bg-warning-bg border border-amber-200">
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            className="mt-0.5 accent-warning w-4 h-4"
            {...register('consentMedical', { required: 'You must acknowledge the medical disclaimer' })}
          />
          <span className="text-xs text-warning leading-relaxed">
            <strong>Medical Disclaimer:</strong> I understand that BloodConnect is a coordination platform only and does not replace medical advice. All blood compatibility and eligibility decisions must be made by qualified hospital or blood bank staff.
          </span>
        </label>
        {errors.consentMedical && (
          <p className="text-xs text-error mt-1.5 flex items-center gap-1 ml-6">
            <AlertCircle size={11} />
            {errors.consentMedical.message}
          </p>
        )}
      </div>

      {/* Terms consent */}
      <div className="mb-5">
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            className="mt-0.5 accent-primary w-4 h-4"
            {...register('consentTerms', { required: 'You must accept the Terms of Service' })}
          />
          <span className="text-xs text-muted-foreground leading-relaxed">
            I agree to the{' '}
            <button type="button" className="text-primary font-semibold hover:underline">Terms of Service</button>
            {' '}and{' '}
            <button type="button" className="text-primary font-semibold hover:underline">Privacy Policy</button>.
            BloodConnect will never sell or share your personal data. No cash-for-blood arrangements are permitted on this platform.
          </span>
        </label>
        {errors.consentTerms && (
          <p className="text-xs text-error mt-1.5 flex items-center gap-1 ml-6">
            <AlertCircle size={11} />
            {errors.consentTerms.message}
          </p>
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading}
        className="btn-primary w-full py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Creating account…
          </>
        ) : (
          <>
            <UserPlus size={16} />
            Create Account
          </>
        )}
      </button>

      <p className="text-center text-sm text-muted-foreground mt-4">
        Already have an account?{' '}
        <button type="button" onClick={onSwitchToLogin} className="text-primary font-semibold hover:underline">
          Sign in
        </button>
      </p>
    </form>
  );
}