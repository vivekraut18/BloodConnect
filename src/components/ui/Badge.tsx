'use client';
import React from 'react';
import { CheckCircle, AlertTriangle, XCircle, Zap, AlertCircle, MinusCircle, Info } from 'lucide-react';
import { InventoryStatus, RequestStatus, RequestPriority, DonorAvailabilityStatus } from '@/lib/constants';
import Icon from '@/components/ui/AppIcon';


type BadgeVariant = 'success' | 'warning' | 'error' | 'critical' | 'info' | 'neutral' | 'emergency';

interface BadgeProps {
  variant: BadgeVariant;
  label: string;
  icon?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

const variantConfig: Record<BadgeVariant, { className: string; Icon: React.ElementType }> = {
  success: { className: 'bg-success-bg text-success border border-green-200', Icon: CheckCircle },
  warning: { className: 'bg-warning-bg text-warning border border-amber-200', Icon: AlertTriangle },
  error: { className: 'bg-error-bg text-error border border-red-200', Icon: AlertCircle },
  critical: { className: 'bg-critical-bg text-critical border border-red-300', Icon: XCircle },
  info: { className: 'bg-primary-light text-primary border border-blue-200', Icon: Info },
  neutral: { className: 'bg-muted text-muted-foreground border border-border', Icon: MinusCircle },
  emergency: { className: 'bg-emergency-bg text-emergency border border-red-300 font-semibold', Icon: Zap },
};

export function Badge({ variant, label, icon = true, size = 'md', className = '' }: BadgeProps) {
  const { className: varClass, Icon } = variantConfig[variant];
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5 gap-1' : 'text-xs px-2.5 py-1 gap-1.5';
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${sizeClass} ${varClass} ${className}`}>
      {icon && <Icon size={size === 'sm' ? 10 : 12} strokeWidth={2.5} />}
      {label}
    </span>
  );
}

export function InventoryStatusBadge({ status }: { status: InventoryStatus }) {
  const map: Record<InventoryStatus, { variant: BadgeVariant; label: string }> = {
    available: { variant: 'success', label: 'Available' },
    low: { variant: 'warning', label: 'Low Stock' },
    critical: { variant: 'critical', label: 'Critical' },
    out_of_stock: { variant: 'neutral', label: 'Out of Stock' },
  };
  const cfg = map[status] ?? { variant: 'neutral', label: status };
  return <Badge variant={cfg.variant} label={cfg.label} />;
}

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  const map: Record<RequestStatus, { variant: BadgeVariant; label: string }> = {
    OPEN: { variant: 'info', label: 'Open' },
    MATCHING: { variant: 'warning', label: 'Matching' },
    DONOR_RESPONDED: { variant: 'warning', label: 'Donor Responded' },
    HOSPITAL_CONFIRMED: { variant: 'success', label: 'Confirmed' },
    FULFILLED: { variant: 'success', label: 'Fulfilled' },
    CANCELLED: { variant: 'neutral', label: 'Cancelled' },
    EXPIRED: { variant: 'neutral', label: 'Expired' },
  };
  const cfg = map[status] ?? { variant: 'neutral', label: status };
  return <Badge variant={cfg.variant} label={cfg.label} />;
}

export function PriorityBadge({ priority }: { priority: RequestPriority }) {
  const map: Record<RequestPriority, { variant: BadgeVariant; label: string }> = {
    EMERGENCY: { variant: 'emergency', label: '⚡ Emergency' },
    URGENT: { variant: 'warning', label: '⚠ Urgent' },
    STANDARD: { variant: 'info', label: 'Standard' },
  };
  const cfg = map[priority] ?? { variant: 'info', label: priority };
  return <Badge variant={cfg.variant} label={cfg.label} />;
}

export function AvailabilityBadge({ status }: { status: DonorAvailabilityStatus }) {
  const map: Record<DonorAvailabilityStatus, { variant: BadgeVariant; label: string }> = {
    available: { variant: 'success', label: 'Available' },
    temporarily_unavailable: { variant: 'warning', label: 'Temporarily Unavailable' },
    do_not_disturb: { variant: 'neutral', label: 'Do Not Disturb' },
  };
  const cfg = map[status] ?? { variant: 'neutral', label: status };
  return <Badge variant={cfg.variant} label={cfg.label} />;
}

export function BloodGroupBadge({ group, size = 'md' }: { group: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = {
    sm: 'text-xs px-2 py-0.5 min-w-[2.25rem]',
    md: 'text-sm px-2.5 py-1 min-w-[2.75rem]',
    lg: 'text-base px-3 py-1.5 min-w-[3.25rem]',
  }[size];
  return (
    <span
      className={`inline-flex items-center justify-center rounded-lg font-bold bg-emergency-bg text-emergency border border-red-200 font-tabular ${sizeClass}`}
    >
      {group}
    </span>
  );
}