'use client';
import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Copy,
  Check,
  Edit3,
  Save,
  X,
  User,
  Phone,
  MapPin,
  Mail,
  Droplets,
  Activity,
  Calendar,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { BloodGroupBadge } from '@/components/ui/Badge';
import { BLOOD_GROUPS, BloodGroup } from '@/lib/constants';
import { useProfile } from '@/components/ProfileContext';
import { toast } from 'sonner';

interface DonorProfileSummaryProps {
  isFullPage?: boolean;
}

export default function DonorProfileSummary(props: DonorProfileSummaryProps) {
  return (
    <React.Suspense fallback={<div className="p-4 text-center text-xs text-muted-foreground">Loading profile…</div>}>
      <DonorProfileSummaryInner {...props} />
    </React.Suspense>
  );
}

function DonorProfileSummaryInner({ isFullPage = false }: DonorProfileSummaryProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editFromUrl = searchParams.get('edit') === 'true';

  const { profile, refreshProfile, isLoading: isProfileLoading } = useProfile();
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(editFromUrl);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    city: '',
    bloodGroup: 'B+' as BloodGroup,
    availabilityStatus: 'available',
  });

  useEffect(() => {
    if (editFromUrl) {
      setIsEditing(true);
    }
  }, [editFromUrl]);

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        phone: profile.phone || '',
        city: profile.city || '',
        bloodGroup: (profile.bloodGroup as BloodGroup) || 'B+',
        availabilityStatus: profile.availabilityStatus || 'available',
      });
    }
  }, [profile]);

  const profileName = profile?.name || 'BloodConnect User';
  const profileEmail = profile?.email || 'user@example.com';
  const profileCity = profile?.city || 'Mumbai';
  const profilePhone = profile?.phone || '';
  const profileBloodGroup = profile?.bloodGroup || 'B+';
  const verificationStatus = profile?.verificationStatus || 'verified';
  const isVerified = verificationStatus === 'verified';
  const reliabilityScore = profile?.reliabilityScore || 96;
  const donationsCompleted = profile?.donationsCompleted || 0;
  const donorId = `BC-${new Date().getFullYear()}-${(profile?.id || '04821').slice(-5).toUpperCase()}`;

  const profileInitials = profileName
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const copyId = () => {
    navigator.clipboard?.writeText(donorId)?.then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }
    if (formData.phone && formData.phone.length < 8) {
      toast.error('Please enter a valid phone number (at least 8 digits)');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          city: formData.city.trim(),
          bloodGroup: formData.bloodGroup,
          availabilityStatus: formData.availabilityStatus,
        }),
      });

      const result = await res.json().catch(() => null);

      if (res.ok && result?.success) {
        toast.success('Profile updated successfully!');
        await refreshProfile();
        setIsEditing(false);
      } else {
        toast.error(result?.error || 'Failed to update profile');
      }
    } catch (err: any) {
      console.error('Error updating profile:', err);
      toast.error('Network error saving profile');
    } finally {
      setIsSaving(false);
    }
  };

  // ----------------------------------------------------
  // FULL PAGE VIEW (for Tab = Profile & Verification)
  // ----------------------------------------------------
  if (isFullPage) {
    return (
      <div className="space-y-6 fade-in max-w-4xl">
        {/* Top card banner */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-white text-xl font-bold shadow-md">
                {profileInitials}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold text-foreground">{profileName}</h2>
                  {isVerified ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-success bg-success-bg border border-green-200 px-2.5 py-0.5 rounded-full">
                      <ShieldCheck size={13} />
                      Verified Donor
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-warning bg-warning-bg border border-amber-200 px-2.5 py-0.5 rounded-full">
                      <AlertCircle size={13} />
                      {verificationStatus.toUpperCase()}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                  BloodConnect ID: <span className="text-foreground font-semibold">{donorId}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={copyId}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border hover:bg-muted text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                {copied ? 'Copied' : 'Copy ID'}
              </button>
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl btn-primary text-xs font-semibold"
                >
                  <Edit3 size={14} />
                  Edit Profile
                </button>
              ) : (
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border hover:bg-muted text-xs font-semibold text-muted-foreground"
                >
                  <X size={14} />
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Edit Form or View Grid */}
        {isEditing ? (
          <form onSubmit={handleSave} className="bg-card border border-border rounded-2xl p-6 space-y-6 shadow-sm">
            <div className="border-b border-border pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-foreground">Edit Profile &amp; Preferences</h3>
                <p className="text-xs text-muted-foreground">
                  Update your contact details, location, and blood donation status.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Full name */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Full Name <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-3 text-muted-foreground" />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input-field pl-9"
                    placeholder="Your Full Name"
                  />
                </div>
              </div>

              {/* Email (Read only) */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Email Address <span className="text-xs text-muted-foreground">(Managed by Auth)</span>
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-3 text-muted-foreground" />
                  <input
                    type="email"
                    disabled
                    value={profileEmail}
                    className="input-field pl-9 bg-muted/60 opacity-80 cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Contact Phone <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <Phone size={15} className="absolute left-3 top-3 text-muted-foreground" />
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="input-field pl-9"
                    placeholder="10-digit mobile number"
                  />
                </div>
              </div>

              {/* City */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  City / Location <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <MapPin size={15} className="absolute left-3 top-3 text-muted-foreground" />
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="input-field pl-9"
                    placeholder="e.g. Mumbai, Delhi, Bengaluru"
                  />
                </div>
              </div>

              {/* Blood Group */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Blood Group <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <Droplets size={15} className="absolute left-3 top-3 text-emergency" />
                  <select
                    value={formData.bloodGroup}
                    onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value as BloodGroup })}
                    className="input-field pl-9"
                  >
                    {BLOOD_GROUPS.map((bg) => (
                      <option key={`bg-opt-${bg}`} value={bg}>
                        {bg}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Availability Status */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Donor Availability Status
                </label>
                <select
                  value={formData.availabilityStatus}
                  onChange={(e) => setFormData({ ...formData, availabilityStatus: e.target.value })}
                  className="input-field"
                >
                  <option value="available">Available (Active for requests)</option>
                  <option value="temporarily_unavailable">Temporarily Unavailable</option>
                  <option value="do_not_disturb">Do Not Disturb</option>
                </select>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
                className="px-5 py-2.5 rounded-xl border border-border hover:bg-muted text-xs font-semibold text-muted-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 rounded-xl btn-primary text-xs font-bold flex items-center gap-2 disabled:opacity-60"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Saving Changes…
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: Personal & Contact details */}
            <div className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-sm font-bold text-foreground">Personal &amp; Contact Details</h3>
                <span className="text-xs text-muted-foreground">Supabase Synced</span>
              </div>

              <div className="space-y-3.5">
                <div className="flex items-start gap-3">
                  <User size={16} className="text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Full Name</p>
                    <p className="text-sm font-semibold text-foreground">{profileName}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail size={16} className="text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Email Address</p>
                    <p className="text-sm font-semibold text-foreground">{profileEmail}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone size={16} className="text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Contact Phone</p>
                    <p className="text-sm font-semibold text-foreground">{profilePhone || 'Not provided'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin size={16} className="text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">City / Region</p>
                    <p className="text-sm font-semibold text-foreground">{profileCity}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Medical & Verification Profile */}
            <div className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-sm font-bold text-foreground">Blood &amp; Verification Status</h3>
                <ShieldCheck size={16} className="text-success" />
              </div>

              <div className="space-y-3.5">
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/60 border border-border">
                  <div>
                    <p className="text-xs text-muted-foreground">Blood Group</p>
                    <p className="text-base font-bold text-foreground font-mono">{profileBloodGroup}</p>
                  </div>
                  <BloodGroupBadge group={profileBloodGroup} size="lg" />
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Verification Status</p>
                  <span className="text-xs font-bold text-success capitalize">{verificationStatus}</span>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Completed Donations</p>
                  <p className="text-xs font-bold text-foreground font-tabular">{donationsCompleted} donations</p>
                </div>

                {/* Reliability Score */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs text-muted-foreground">Reliability Score</p>
                    <p className="text-xs font-bold text-success">{reliabilityScore}%</p>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-success rounded-full transition-all duration-700"
                      style={{ width: `${reliabilityScore}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Calculated from confirmed donations and response commitments.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ----------------------------------------------------
  // COMPACT OVERVIEW VIEW (for Dashboard Overview sidebar)
  // ----------------------------------------------------
  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-foreground">Donor Profile</h3>
        <button
          onClick={() => router.push('/donor-dashboard?tab=profile&edit=true')}
          className="text-xs text-primary font-semibold hover:underline flex items-center gap-1"
        >
          <Edit3 size={12} />
          Edit
        </button>
      </div>

      {/* Avatar + name */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-white text-base font-bold flex-shrink-0 shadow-sm">
          {profileInitials}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-bold text-foreground truncate">{profileName}</p>
            {isVerified && <ShieldCheck size={14} className="text-success flex-shrink-0" />}
          </div>
          <p className="text-xs text-muted-foreground capitalize">{verificationStatus} Donor</p>
        </div>
      </div>

      {/* BloodConnect ID */}
      <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/60 border border-border mb-3">
        <div>
          <p className="text-[11px] text-muted-foreground">BloodConnect ID</p>
          <p className="text-sm font-bold text-foreground font-mono">{donorId}</p>
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
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Blood Group</p>
          <BloodGroupBadge group={profileBloodGroup} size="sm" />
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Location</p>
          <p className="text-xs font-semibold text-foreground">{profileCity}</p>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Email</p>
          <p className="text-xs font-semibold text-foreground truncate max-w-[150px]">{profileEmail}</p>
        </div>
      </div>

      {/* Reliability bar */}
      <div className="mt-4 pt-3 border-t border-border">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs text-muted-foreground">Reliability Score</p>
          <p className="text-xs font-bold text-success">{reliabilityScore}%</p>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-success rounded-full transition-all duration-700"
            style={{ width: `${reliabilityScore}%` }}
          />
        </div>
        <p className="text-[11px] text-muted-foreground mt-1">
          Based on verified donation activity
        </p>
      </div>
    </div>
  );
}
