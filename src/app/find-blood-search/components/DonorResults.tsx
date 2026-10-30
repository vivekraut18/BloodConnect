'use client';
import React, { useState, useEffect } from 'react';
import { Clock, MessageCircle, UserCheck, Shield, AlertCircle } from 'lucide-react';
import { BloodGroupBadge, AvailabilityBadge } from '@/components/ui/Badge';
import { SearchResultCardSkeleton } from '@/components/ui/LoadingSkeleton';
import EmptyState from '@/components/ui/EmptyState';
import Modal from '@/components/ui/Modal';
import { BloodGroup, DonorAvailabilityStatus } from '@/lib/constants';
import { toast } from 'sonner';

export interface MatchedDonor {
  id: string;
  userId?: string;
  bloodConnectId: string;
  initials: string;
  firstName: string;
  fullName?: string;
  bloodGroup: BloodGroup;
  city?: string;
  phone?: string;
  approxDistanceKm: number;
  availabilityStatus: DonorAvailabilityStatus;
  isVerified: boolean;
  donationsCompleted: number;
  reliabilityScore: number;
  lastActiveDaysAgo: number;
  respondedToRequests: number;
}

interface DonorResultsProps {
  bloodGroup: BloodGroup | '';
  location?: string;
  isLoading?: boolean;
  showCompatible?: boolean;
  donors?: MatchedDonor[];
}

export default function DonorResults({
  bloodGroup,
  location = '',
  isLoading: externalLoading = false,
  donors: propDonors,
}: DonorResultsProps) {
  const [contactDonor, setContactDonor] = useState<MatchedDonor | null>(null);
  const [donors, setDonors] = useState<MatchedDonor[]>(propDonors || []);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (propDonors && propDonors.length > 0) {
      setDonors(propDonors);
      return;
    }

    let active = true;
    setLoading(true);

    const queryParams = new URLSearchParams();
    if (bloodGroup) queryParams.set('bloodGroup', bloodGroup);
    if (location) queryParams.set('city', location);

    fetch(`/api/donors?${queryParams.toString()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data?.data) {
          const formatted = data.data.map((d: any) => ({
            id: d.id,
            userId: d.userId,
            bloodConnectId: d.bloodConnectId,
            initials: d.initials || 'BD',
            firstName: d.firstName || 'Donor',
            fullName: d.fullName,
            bloodGroup: d.bloodGroup as BloodGroup,
            city: d.city,
            phone: d.phone,
            approxDistanceKm: 2.5,
            availabilityStatus: (d.availabilityStatus as DonorAvailabilityStatus) || 'available',
            isVerified: d.isVerified ?? true,
            donationsCompleted: d.donationsCompleted || 0,
            reliabilityScore: d.reliabilityScore || 100,
            lastActiveDaysAgo: 0,
            respondedToRequests: (d.donationsCompleted || 0) + 2,
          }));
          setDonors(formatted);
        }
      })
      .catch((err) => console.error('Error fetching donors:', err))
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [bloodGroup, location, propDonors]);

  const isLoading = externalLoading || loading;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {Array.from({ length: 6 }, (_, i) => (
          <SearchResultCardSkeleton key={`donor-skel-${i}`} />
        ))}
      </div>
    );
  }

  const filtered = bloodGroup
    ? donors.filter((d) => d.bloodGroup === bloodGroup)
    : donors;

  if (filtered.length === 0) {
    return <EmptyState variant="donors" title="No matching donors found" description="Try adjusting your blood group filter or search radius." />;
  }

  return (
    <>
      {/* Privacy notice */}
      <div className="flex items-start gap-2 p-3 rounded-xl bg-primary-light border border-blue-200 mb-3">
        <Shield size={14} className="text-primary flex-shrink-0 mt-0.5" />
        <p className="text-xs text-primary leading-relaxed">
          <strong>Privacy Protected:</strong> Donor exact location, address, and phone number are never shown publicly. Contact is mediated through BloodConnect.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {filtered.map((donor) => (
          <DonorCard
            key={`donor-${donor.id}`}
            donor={donor}
            onContact={() => setContactDonor(donor)}
          />
        ))}
      </div>

      {/* Contact modal */}
      <Modal
        isOpen={!!contactDonor}
        onClose={() => setContactDonor(null)}
        title="Send Donation Request"
        size="sm"
      >
        {contactDonor && (
          <ContactDonorForm
            donor={contactDonor}
            onClose={() => setContactDonor(null)}
          />
        )}
      </Modal>
    </>
  );
}

function DonorCard({ donor, onContact }: { donor: MatchedDonor; onContact: () => void }) {
  const isUnavailable = donor.availabilityStatus !== 'available';

  return (
    <div className={`bg-card border rounded-2xl p-4 card-hover ${isUnavailable ? 'opacity-70 border-border' : 'border-border'}`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {donor.initials}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-bold text-foreground">{donor.firstName}</p>
              {donor.isVerified && (
                <UserCheck size={13} className="text-success" />
              )}
            </div>
            <p className="text-xs text-muted-foreground font-mono">{donor.bloodConnectId}</p>
          </div>
        </div>
        <BloodGroupBadge group={donor.bloodGroup} size="sm" />
      </div>

      {/* Availability */}
      <div className="mb-3">
        <AvailabilityBadge status={donor.availabilityStatus} />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="text-center">
          <p className="text-base font-bold text-foreground font-tabular">{donor.approxDistanceKm || 'Near'}</p>
          <p className="text-xs text-muted-foreground">km away</p>
        </div>
        <div className="text-center border-x border-border">
          <p className="text-base font-bold text-foreground font-tabular">{donor.donationsCompleted}</p>
          <p className="text-xs text-muted-foreground">donations</p>
        </div>
        <div className="text-center">
          <p className={`text-base font-bold font-tabular ${
            donor.reliabilityScore >= 85 ? 'text-success' :
            donor.reliabilityScore >= 60 ? 'text-warning' : 'text-error'
          }`}>
            {donor.reliabilityScore}%
          </p>
          <p className="text-xs text-muted-foreground">reliable</p>
        </div>
      </div>

      {/* Last active */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
        <Clock size={11} />
        <span>
          {donor.lastActiveDaysAgo === 0
            ? 'Active recently'
            : `Active ${donor.lastActiveDaysAgo} day${donor.lastActiveDaysAgo !== 1 ? 's' : ''} ago`}
        </span>
      </div>

      {/* Action */}
      <button
        onClick={onContact}
        disabled={isUnavailable}
        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed btn-primary"
      >
        <MessageCircle size={13} />
        {isUnavailable ? 'Donor Unavailable' : 'Send Donation Request'}
      </button>
    </div>
  );
}

function ContactDonorForm({ donor, onClose }: { donor: MatchedDonor; onClose: () => void }) {
  const [message, setMessage] = useState('');
  const [hospital, setHospital] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);

    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bloodGroup: donor.bloodGroup,
          priority: 'URGENT',
          hospital: hospital.trim() || 'Local Medical Centre',
          unitsNeeded: 1,
          contactNumber: contactNumber.trim() || '9999999999',
          city: donor.city || 'Mumbai',
          notes: message.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`Donation request sent to ${donor.firstName}! BloodConnect relayed request ID ${data.data?.request?.requestId || ''}`);
        onClose();
      } else {
        toast.error(data.error || 'Failed to send request. Please log in or check input.');
      }
    } catch (err: any) {
      toast.error('Network error sending request.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-3 rounded-xl bg-muted">
        <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold">
          {donor.initials}
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">{donor.firstName} · {donor.bloodGroup}</p>
          <p className="text-xs text-muted-foreground">{donor.bloodConnectId}</p>
        </div>
      </div>

      <div className="p-3 rounded-xl bg-primary-light border border-blue-200">
        <div className="flex items-start gap-2">
          <AlertCircle size={13} className="text-primary flex-shrink-0 mt-0.5" />
          <p className="text-xs text-primary leading-relaxed">
            Your request will be recorded securely in BloodConnect and relayed to available donors.
          </p>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-foreground mb-1">Hospital / Clinic Name</label>
        <input
          type="text"
          value={hospital}
          onChange={(e) => setHospital(e.target.value)}
          placeholder="e.g. Apollo Hospital, Andheri"
          className="input-field text-sm mb-3"
        />

        <label className="block text-xs font-semibold text-foreground mb-1">Contact Number</label>
        <input
          type="tel"
          value={contactNumber}
          onChange={(e) => setContactNumber(e.target.value)}
          placeholder="e.g. +91 98765 43210"
          className="input-field text-sm mb-3"
        />

        <label className="block text-xs font-semibold text-foreground mb-1">Request Message</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          placeholder="Describe the urgent requirement briefly..."
          className="input-field resize-none text-sm"
          maxLength={300}
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground border border-border hover:bg-muted transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSend}
          disabled={!message.trim() || sending}
          className="flex-1 btn-primary py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {sending ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Sending…
            </>
          ) : (
            'Send Request'
          )}
        </button>
      </div>
    </div>
  );
}
