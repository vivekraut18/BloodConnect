'use client';
import React from 'react';
import { ShieldCheck, Copy, Check, ExternalLink } from 'lucide-react';
import { BloodGroupBadge } from '@/components/ui/Badge';
import { useState } from 'react';

const PROFILE_FIELDS = [
  { label: 'Blood Group', value: 'B+', isBloodGroup: true },
  { label: 'City', value: 'Andheri West, Mumbai', isBloodGroup: false },
  { label: 'Date of Birth', value: '14 Mar 1992', isBloodGroup: false },
  { label: 'Verification', value: 'Identity + Medical', isBloodGroup: false },
  { label: 'Member Since', value: 'Jan 2023', isBloodGroup: false },
];

export default function DonorProfileSummary() {
  const [copied, setCopied] = useState(false);

  const copyId = () => {
    navigator.clipboard?.writeText('BC-2026-04821')?.then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-foreground">Donor Profile</h3>
        <button className="flex items-center gap-1 text-xs text-primary font-semibold hover:underline">
          <ExternalLink size={12} />
          Edit Profile
        </button>
      </div>

      {/* Avatar + name */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white text-base font-bold">
          AM
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-bold text-foreground">Arjun Mehta</p>
            <ShieldCheck size={14} className="text-success" title="Identity verified" />
          </div>
          <p className="text-xs text-muted-foreground">Verified Donor</p>
        </div>
      </div>

      {/* BloodConnect ID */}
      <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted border border-border mb-3">
        <div>
          <p className="text-xs text-muted-foreground">BloodConnect ID</p>
          <p className="text-sm font-bold text-foreground font-mono">BC-2026-04821</p>
        </div>
        <button
          onClick={copyId}
          className="p-1.5 rounded-lg hover:bg-border text-muted-foreground hover:text-foreground transition-colors"
          title="Copy BloodConnect ID"
          aria-label="Copy BloodConnect ID"
        >
          {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
        </button>
      </div>

      {/* Key fields */}
      <div className="space-y-2">
        {PROFILE_FIELDS?.map((field) => (
          <div key={`profile-field-${field?.label}`} className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{field?.label}</p>
            {field?.isBloodGroup ? (
              <BloodGroupBadge group={field?.value} size="sm" />
            ) : (
              <p className="text-xs font-semibold text-foreground">{field?.value}</p>
            )}
          </div>
        ))}
      </div>

      {/* Reliability bar */}
      <div className="mt-4 pt-3 border-t border-border">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs text-muted-foreground">Reliability Score</p>
          <p className="text-xs font-bold text-success">96%</p>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-success rounded-full transition-all duration-700"
            style={{ width: '96%' }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Based on 17 responses · 14 completed · 1 cancelled · 0 no-shows
        </p>
      </div>
    </div>
  );
}