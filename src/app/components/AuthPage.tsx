'use client';
import React, { useState } from 'react';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import AppLogo from '@/components/ui/AppLogo';
import { Droplets, ShieldCheck, Clock, Users, AlertTriangle } from 'lucide-react';

const BRAND_STATS = [
  { value: '48,291', label: 'Verified Donors' },
  { value: '12,847', label: 'Requests Fulfilled' },
  { value: '98.4%', label: 'Data Accuracy' },
  { value: '< 18 min', label: 'Avg Match Time' },
];

const TRUST_BADGES = [
  { Icon: ShieldCheck, label: 'Argon2id Secured' },
  { Icon: Clock, label: 'Real-time Data' },
  { Icon: Users, label: 'Hospital Verified' },
];

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left brand panel */}
      <div className="hidden lg:flex flex-col w-[45%] xl:w-[42%] bg-foreground relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-5">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Decorative blood drop */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 opacity-5">
          <Droplets size={288} className="text-emergency" />
        </div>

        <div className="relative z-10 flex flex-col h-full px-10 py-8">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <AppLogo size={40} />
            <span className="text-xl font-bold text-white">BloodConnect</span>
          </div>

          {/* Main copy */}
          <div className="flex-1 flex flex-col justify-center">
            <div className="mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emergency/20 border border-emergency/30 text-emergency text-xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emergency blood-drop-pulse" />
                Live Platform — India
              </span>
            </div>
            <h1 className="text-3xl xl:text-4xl font-extrabold text-white leading-tight mt-3 mb-4">
              Every second counts.<br />
              <span className="text-emergency">Find blood fast.</span>
            </h1>
            <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
              Connecting verified donors, hospitals, and blood banks across India for emergency blood coordination — with full transparency and no cash-for-blood.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mt-8">
              {BRAND_STATS.map((stat) => (
                <div key={`brand-stat-${stat.label}`} className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <p className="text-2xl font-extrabold text-white font-tabular">{stat.value}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap gap-2 mt-6">
            {TRUST_BADGES.map((badge) => (
              <div key={`trust-${badge.label}`} className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5">
                <badge.Icon size={13} className="text-slate-400" />
                <span className="text-xs text-slate-400">{badge.label}</span>
              </div>
            ))}
          </div>

          {/* Disclaimer */}
          <div className="mt-4 p-3 rounded-xl bg-warning/10 border border-warning/20">
            <div className="flex items-start gap-2">
              <AlertTriangle size={13} className="text-warning flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-400 leading-relaxed">
                BloodConnect is a coordination tool only. All medical decisions must be made by qualified hospital or blood bank staff.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 sm:px-8 py-8 overflow-y-auto">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-6">
          <AppLogo size={36} />
          <span className="text-lg font-bold text-foreground">BloodConnect</span>
        </div>

        <div className="w-full max-w-md">
          {/* Mode toggle */}
          <div className="flex rounded-xl border border-border bg-muted p-1 mb-6">
            {(['login', 'register'] as const).map((m) => (
              <button
                key={`mode-${m}`}
                onClick={() => setMode(m)}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                  mode === m
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          {mode === 'login' ? (
            <LoginForm onSwitchToRegister={() => setMode('register')} />
          ) : (
            <RegisterForm onSwitchToLogin={() => setMode('login')} />
          )}
        </div>
      </div>
    </div>
  );
}
