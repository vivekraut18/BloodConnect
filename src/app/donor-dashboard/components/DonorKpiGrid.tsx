'use client';
import React from 'react';
import { Droplets, Star, Activity, Calendar, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

interface KpiCard {
  id: string;
  label: string;
  value: string;
  subValue?: string;
  trend?: { direction: 'up' | 'down' | 'neutral'; label: string };
  icon: React.ElementType;
  variant: 'default' | 'success' | 'warning' | 'alert' | 'info';
  colSpan?: string;
  note?: string;
}

const DONOR_KPIS: KpiCard[] = [
  {
    id: 'kpi-donations',
    label: 'Total Donations',
    value: '14',
    subValue: 'Verified by hospital staff',
    trend: { direction: 'up', label: '+2 this year' },
    icon: Droplets,
    variant: 'success',
  },
  {
    id: 'kpi-reliability',
    label: 'Reliability Score',
    value: '96%',
    subValue: '17 responded · 14 completed · 1 cancelled · 0 no-shows',
    trend: { direction: 'up', label: '+3% vs last 6 months' },
    icon: Star,
    variant: 'success',
  },
  {
    id: 'kpi-requests',
    label: 'Requests Responded',
    value: '17',
    subValue: 'Last response: 3 days ago',
    trend: { direction: 'neutral', label: 'Steady activity' },
    icon: Activity,
    variant: 'default',
  },
  {
    id: 'kpi-next-eligible',
    label: 'Next Eligible Date',
    value: '10 Dec 2026',
    subValue: 'Last donation: 10 Sep 2026',
    note: '88 days remaining — not yet eligible',
    icon: Calendar,
    variant: 'alert',
  },
];

export default function DonorKpiGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-4 gap-4">
      {DONOR_KPIS.map((kpi) => (
        <KpiCard key={kpi.id} card={kpi} />
      ))}
    </div>
  );
}

function KpiCard({ card }: { card: KpiCard }) {
  const variantStyles = {
    default: 'bg-card border-border',
    success: 'bg-card border-border',
    warning: 'bg-warning-bg border-amber-200',
    alert: 'bg-error-bg border-red-200',
    info: 'bg-primary-light border-blue-200',
  };

  const iconBgStyles = {
    default: 'bg-muted text-muted-foreground',
    success: 'bg-success-bg text-success',
    warning: 'bg-warning-bg text-warning',
    alert: 'bg-critical-bg text-critical',
    info: 'bg-primary-light text-primary',
  };

  const valueStyles = {
    default: 'text-foreground',
    success: 'text-foreground',
    warning: 'text-warning',
    alert: 'text-critical',
    info: 'text-primary',
  };

  return (
    <div className={`rounded-2xl border p-5 ${variantStyles[card.variant]} transition-all duration-200 hover:shadow-md`}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide leading-tight">
          {card.label}
        </p>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBgStyles[card.variant]}`}>
          <card.icon size={18} strokeWidth={2} />
        </div>
      </div>

      <p className={`text-3xl font-extrabold font-tabular leading-none mb-1.5 ${valueStyles[card.variant]}`}>
        {card.value}
      </p>

      {card.subValue && (
        <p className="text-xs text-muted-foreground leading-relaxed">{card.subValue}</p>
      )}

      {card.note && (
        <div className="flex items-center gap-1.5 mt-2">
          <AlertCircle size={12} className="text-critical flex-shrink-0" />
          <p className="text-xs text-critical font-medium">{card.note}</p>
        </div>
      )}

      {card.trend && (
        <div className="flex items-center gap-1 mt-2">
          {card.trend.direction === 'up' ? (
            <TrendingUp size={12} className="text-success" />
          ) : card.trend.direction === 'down' ? (
            <TrendingDown size={12} className="text-error" />
          ) : (
            <span className="w-3 h-0.5 bg-muted-foreground rounded-full" />
          )}
          <p className={`text-xs font-medium ${
            card.trend.direction === 'up' ? 'text-success' :
            card.trend.direction === 'down'? 'text-error' : 'text-muted-foreground'
          }`}>
            {card.trend.label}
          </p>
        </div>
      )}
    </div>
  );
}