'use client';
import React, { useState, useEffect } from 'react';
import { Droplets, Star, Activity, Calendar, AlertCircle } from 'lucide-react';

interface DonorStats {
  totalDonations: number;
  livesImpacted: number;
  nextEligibleDate: string | null;
  currentStreak: number;
  bloodGroup: string;
  availabilityStatus: string;
  lastDonationDate: string | null;
}

export default function DonorKpiGrid() {
  const [stats, setStats] = useState<DonorStats>({
    totalDonations: 0,
    livesImpacted: 0,
    nextEligibleDate: null,
    currentStreak: 0,
    bloodGroup: 'B+',
    availabilityStatus: 'available',
    lastDonationDate: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch('/api/dashboard/donor-stats')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data?.data) {
          setStats(data.data);
        }
      })
      .catch((err) => console.error('Error fetching donor stats:', err))
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const formattedEligibleDate = stats.nextEligibleDate
    ? new Date(stats.nextEligibleDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'Eligible Now';

  const formattedLastDonation = stats.lastDonationDate
    ? new Date(stats.lastDonationDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'None registered';

  const isEligibleNow = !stats.nextEligibleDate || new Date(stats.nextEligibleDate) <= new Date();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {/* Total Donations */}
      <div className="rounded-2xl border border-border bg-card p-5 transition-all duration-200 hover:shadow-md">
        <div className="flex items-start justify-between mb-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total Donations</p>
          <div className="w-9 h-9 rounded-xl bg-success-bg text-success flex items-center justify-center flex-shrink-0">
            <Droplets size={18} />
          </div>
        </div>
        <p className="text-3xl font-extrabold font-tabular text-foreground leading-none mb-1.5">
          {loading ? '—' : stats.totalDonations}
        </p>
        <p className="text-xs text-muted-foreground">Verified by medical staff</p>
        <p className="text-xs font-medium text-success mt-2">Impacted ~{stats.livesImpacted} lives</p>
      </div>

      {/* Reliability */}
      <div className="rounded-2xl border border-border bg-card p-5 transition-all duration-200 hover:shadow-md">
        <div className="flex items-start justify-between mb-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Reliability Score</p>
          <div className="w-9 h-9 rounded-xl bg-success-bg text-success flex items-center justify-center flex-shrink-0">
            <Star size={18} />
          </div>
        </div>
        <p className="text-3xl font-extrabold font-tabular text-foreground leading-none mb-1.5">96%</p>
        <p className="text-xs text-muted-foreground">High response reliability</p>
        <p className="text-xs font-medium text-success mt-2">Verified Donor Status</p>
      </div>

      {/* Activity */}
      <div className="rounded-2xl border border-border bg-card p-5 transition-all duration-200 hover:shadow-md">
        <div className="flex items-start justify-between mb-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Streak & Activity</p>
          <div className="w-9 h-9 rounded-xl bg-muted text-muted-foreground flex items-center justify-center flex-shrink-0">
            <Activity size={18} />
          </div>
        </div>
        <p className="text-3xl font-extrabold font-tabular text-foreground leading-none mb-1.5">
          {loading ? '—' : `${stats.currentStreak} Don.`}
        </p>
        <p className="text-xs text-muted-foreground">Completed donation cycle</p>
        <p className="text-xs font-medium text-primary mt-2">Active in Mumbai</p>
      </div>

      {/* Next Eligible Date */}
      <div className={`rounded-2xl border p-5 transition-all duration-200 hover:shadow-md ${
        isEligibleNow ? 'bg-success-bg border-green-200' : 'bg-error-bg border-red-200'
      }`}>
        <div className="flex items-start justify-between mb-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Next Eligible Date</p>
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
            isEligibleNow ? 'bg-success text-white' : 'bg-critical-bg text-critical'
          }`}>
            <Calendar size={18} />
          </div>
        </div>
        <p className={`text-2xl font-extrabold font-tabular leading-none mb-1.5 ${
          isEligibleNow ? 'text-success' : 'text-critical'
        }`}>
          {loading ? '—' : formattedEligibleDate}
        </p>
        <p className="text-xs text-muted-foreground">Last donation: {formattedLastDonation}</p>
        {!isEligibleNow && (
          <div className="flex items-center gap-1.5 mt-2">
            <AlertCircle size={12} className="text-critical flex-shrink-0" />
            <p className="text-xs text-critical font-medium">90-day recovery interval active</p>
          </div>
        )}
      </div>
    </div>
  );
}