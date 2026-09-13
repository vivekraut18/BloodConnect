'use client';
import React, { useState } from 'react';
import { Clock, MessageCircle, UserCheck, Shield, AlertCircle } from 'lucide-react';
import { BloodGroupBadge, AvailabilityBadge } from '@/components/ui/Badge';
import { SearchResultCardSkeleton } from '@/components/ui/LoadingSkeleton';
import EmptyState from '@/components/ui/EmptyState';
import Modal from '@/components/ui/Modal';
import { BloodGroup, DonorAvailabilityStatus } from '@/lib/constants';
import { toast } from 'sonner';

interface MatchedDonor {
  id: string;
  bloodConnectId: string;
  initials: string;
  firstName: string;
  bloodGroup: BloodGroup;
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
  isLoading: boolean;
  showCompatible: boolean;
}

// Mock data — BACKEND INTEGRATION: replace with /api/search/donors?bloodGroup=B+&lat=...&lng=...&radius=10
const MOCK_DONORS: MatchedDonor[] = [
  {
    id: 'donor-001',
    bloodConnectId: 'BC-2026-04821',
    initials: 'AM',
    firstName: 'Arjun',
    bloodGroup: 'B+',
    approxDistanceKm: 1.2,
    availabilityStatus: 'available',
    isVerified: true,
    donationsCompleted: 14,
    reliabilityScore: 96,
    lastActiveDaysAgo: 0,
    respondedToRequests: 17,
  },
  {
    id: 'donor-002',
    bloodConnectId: 'BC-2026-03147',
    initials: 'PS',
    firstName: 'Priya',
    bloodGroup: 'B+',
    approxDistanceKm: 2.1,
    availabilityStatus: 'available',
    isVerified: true,
    donationsCompleted: 8,
    reliabilityScore: 88,
    lastActiveDaysAgo: 1,
    respondedToRequests: 10,
  },
  {
    id: 'donor-003',
    bloodConnectId: 'BC-2026-02983',
    initials: 'RK',
    firstName: 'Rahul',
    bloodGroup: 'B+',
    approxDistanceKm: 3.4,
    availabilityStatus: 'available',
    isVerified: true,
    donationsCompleted: 22,
    reliabilityScore: 94,
    lastActiveDaysAgo: 0,
    respondedToRequests: 25,
  },
  {
    id: 'donor-004',
    bloodConnectId: 'BC-2026-01829',
    initials: 'NJ',
    firstName: 'Neha',
    bloodGroup: 'B+',
    approxDistanceKm: 4.0,
    availabilityStatus: 'temporarily_unavailable',
    isVerified: true,
    donationsCompleted: 5,
    reliabilityScore: 72,
    lastActiveDaysAgo: 3,
    respondedToRequests: 7,
  },
  {
    id: 'donor-005',
    bloodConnectId: 'BC-2026-05512',
    initials: 'VD',
    firstName: 'Vikram',
    bloodGroup: 'B+',
    approxDistanceKm: 4.8,
    availabilityStatus: 'available',
    isVerified: false,
    donationsCompleted: 2,
    reliabilityScore: 65,
    lastActiveDaysAgo: 2,
    respondedToRequests: 3,
  },
  {
    id: 'donor-006',
    bloodConnectId: 'BC-2026-03901',
    initials: 'SA',
    firstName: 'Sunita',
    bloodGroup: 'B+',
    approxDistanceKm: 5.3,
    availabilityStatus: 'available',
    isVerified: true,
    donationsCompleted: 11,
    reliabilityScore: 91,
    lastActiveDaysAgo: 0,
    respondedToRequests: 13,
  },
  {
    id: 'donor-007',
    bloodConnectId: 'BC-2026-02244',
    initials: 'KP',
    firstName: 'Kiran',
    bloodGroup: 'B-',
    approxDistanceKm: 6.1,
    availabilityStatus: 'available',
    isVerified: true,
    donationsCompleted: 7,
    reliabilityScore: 83,
    lastActiveDaysAgo: 1,
    respondedToRequests: 9,
  },
  {
    id: 'donor-008',
    bloodConnectId: 'BC-2026-04103',
    initials: 'MR',
    firstName: 'Manoj',
    bloodGroup: 'B+',
    approxDistanceKm: 7.4,
    availabilityStatus: 'do_not_disturb',
    isVerified: true,
    donationsCompleted: 18,
    reliabilityScore: 97,
    lastActiveDaysAgo: 5,
    respondedToRequests: 20,
  },
];

export default function DonorResults({ bloodGroup, isLoading }: DonorResultsProps) {
  const [contactDonor, setContactDonor] = useState<MatchedDonor | null>(null);

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
    ? MOCK_DONORS.filter((d) => d.bloodGroup === bloodGroup || d.availabilityStatus === 'available')
    : MOCK_DONORS;

  if (filtered.length === 0) {
    return <EmptyState variant="donors" />;
  }

  return (
    <>
      {/* Privacy notice */}
      <div className="flex items-start gap-2 p-3 rounded-xl bg-primary-light border border-blue-200 mb-3">
        <Shield size={14} className="text-primary flex-shrink-0 mt-0.5" />
        <p className="text-xs text-primary leading-relaxed">
          <strong>Privacy Protected:</strong> Donor exact location, address, and phone number are never shown. Only approximate distance and limited identity are displayed. Contact is mediated through BloodConnect.
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
    <div className={`bg-card border rounded-2xl p-4 card-hover ${isUnavailable ? 'opacity-70' : 'border-border'}`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {donor.initials}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-bold text-foreground">{donor.firstName}</p>
              {donor.isVerified && (
                <UserCheck size={13} className="text-success" title="Verified donor" />
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
          <p className="text-base font-bold text-foreground font-tabular">{donor.approxDistanceKm}</p>
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
            ? 'Active today'
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
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);
    // BACKEND INTEGRATION: POST /api/donor-requests — sends anonymized request to donor
    await new Promise((r) => setTimeout(r, 900));
    setSending(false);
    toast.success(`Donation request sent to ${donor.firstName}. They will be notified via BloodConnect.`);
    onClose();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-3 rounded-xl bg-muted">
        <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold">
          {donor.initials}
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">{donor.firstName} · {donor.bloodGroup}</p>
          <p className="text-xs text-muted-foreground">{donor.bloodConnectId} · ~{donor.approxDistanceKm} km away</p>
        </div>
      </div>

      <div className="p-3 rounded-xl bg-primary-light border border-blue-200">
        <div className="flex items-start gap-2">
          <AlertCircle size={13} className="text-primary flex-shrink-0 mt-0.5" />
          <p className="text-xs text-primary leading-relaxed">
            Your contact details will not be shared with the donor at this stage. BloodConnect will relay your request anonymously. The donor's phone number will only be shared by a hospital/blood bank staff member after eligibility is confirmed.
          </p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-foreground mb-1.5">
          Request Message
        </label>
        <p className="text-xs text-muted-foreground mb-1.5">
          Describe the need briefly. Do not include personal contact details.
        </p>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          placeholder="e.g. Urgent need for B+ blood at Lilavati Hospital, Bandra. Patient is post-surgery. Please respond if available."
          className="input-field resize-none"
          maxLength={300}
        />
        <p className="text-xs text-muted-foreground text-right mt-1">{message.length}/300</p>
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