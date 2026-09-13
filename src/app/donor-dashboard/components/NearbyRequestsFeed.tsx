'use client';
import React, { useState } from 'react';
import { MapPin, Clock, Users, CheckCircle, XCircle, ChevronRight, RefreshCw } from 'lucide-react';
import { BloodGroupBadge, PriorityBadge, RequestStatusBadge } from '@/components/ui/Badge';
import { RequestCardSkeleton } from '@/components/ui/LoadingSkeleton';
import EmptyState from '@/components/ui/EmptyState';
import Modal from '@/components/ui/Modal';
import { RequestPriority, RequestStatus } from '@/lib/constants';
import { toast } from 'sonner';

interface NearbyRequest {
  id: string;
  requestId: string;
  bloodGroup: string;
  unitsRequired: number;
  hospitalName: string;
  distanceKm: number;
  priority: RequestPriority;
  status: RequestStatus;
  respondedCount: number;
  requiredBy: string;
  postedMinutesAgo: number;
  isEmergency: boolean;
  notes: string;
}

// Mock data — BACKEND INTEGRATION: GET /api/blood-requests/nearby
const MOCK_NEARBY_REQUESTS: NearbyRequest[] = [
  {
    id: 'req-001',
    requestId: 'BL-2026-04731',
    bloodGroup: 'B+',
    unitsRequired: 3,
    hospitalName: 'Apollo Hospital, Andheri East',
    distanceKm: 2.4,
    priority: 'EMERGENCY',
    status: 'MATCHING',
    respondedCount: 1,
    requiredBy: '13 Sep 2026, 2:00 PM',
    postedMinutesAgo: 8,
    isEmergency: true,
    notes: 'Post-cardiac surgery patient. O.T. on standby. Please arrive at Blood Bank counter, Ground Floor.',
  },
  {
    id: 'req-002',
    requestId: 'BL-2026-04698',
    bloodGroup: 'B+',
    unitsRequired: 2,
    hospitalName: 'Lilavati Hospital, Bandra West',
    distanceKm: 1.8,
    priority: 'URGENT',
    status: 'OPEN',
    respondedCount: 0,
    requiredBy: '13 Sep 2026, 6:00 PM',
    postedMinutesAgo: 34,
    isEmergency: false,
    notes: 'Thalassemia patient requiring regular transfusion. Appointment scheduled for 5:00 PM.',
  },
  {
    id: 'req-003',
    requestId: 'BL-2026-04652',
    bloodGroup: 'B+',
    unitsRequired: 1,
    hospitalName: 'Hinduja Hospital, Mahim',
    distanceKm: 3.1,
    priority: 'STANDARD',
    status: 'DONOR_RESPONDED',
    respondedCount: 2,
    requiredBy: '14 Sep 2026, 10:00 AM',
    postedMinutesAgo: 180,
    isEmergency: false,
    notes: 'Elective surgery scheduled for tomorrow morning. Pre-surgery blood reserve.',
  },
  {
    id: 'req-004',
    requestId: 'BL-2026-04589',
    bloodGroup: 'B+',
    unitsRequired: 4,
    hospitalName: 'KEM Hospital, Parel',
    distanceKm: 5.9,
    priority: 'URGENT',
    status: 'OPEN',
    respondedCount: 1,
    requiredBy: '13 Sep 2026, 8:00 PM',
    postedMinutesAgo: 72,
    isEmergency: false,
    notes: 'Road accident patient admitted to trauma ward. Multiple units needed.',
  },
  {
    id: 'req-005',
    requestId: 'BL-2026-04501',
    bloodGroup: 'B-',
    unitsRequired: 2,
    hospitalName: 'Kokilaben Hospital, Andheri West',
    distanceKm: 4.7,
    priority: 'EMERGENCY',
    status: 'MATCHING',
    respondedCount: 0,
    requiredBy: '13 Sep 2026, 12:30 PM',
    postedMinutesAgo: 5,
    isEmergency: true,
    notes: 'Rare B- required urgently for obstetric emergency. ICU admission.',
  },
  {
    id: 'req-006',
    requestId: 'BL-2026-04477',
    bloodGroup: 'B+',
    unitsRequired: 1,
    hospitalName: 'Breach Candy Hospital, Breach Candy',
    distanceKm: 6.3,
    priority: 'STANDARD',
    status: 'FULFILLED',
    respondedCount: 3,
    requiredBy: '12 Sep 2026, 5:00 PM',
    postedMinutesAgo: 1440,
    isEmergency: false,
    notes: 'Routine transfusion for anaemia patient.',
  },
];

export default function NearbyRequestsFeed() {
  const [isLoading, setIsLoading] = useState(false);
  const [respondingTo, setRespondingTo] = useState<NearbyRequest | null>(null);
  const [respondedIds, setRespondedIds] = useState<Set<string>>(new Set());

  const handleRefresh = async () => {
    setIsLoading(true);
    // BACKEND INTEGRATION: GET /api/blood-requests/nearby?donorId=...&radius=10
    await new Promise((r) => setTimeout(r, 800));
    setIsLoading(false);
    toast.success('Nearby requests refreshed.');
  };

  const handleRespond = (req: NearbyRequest) => setRespondingTo(req);

  const confirmResponse = async (accepted: boolean) => {
    if (!respondingTo) return;
    // BACKEND INTEGRATION: POST /api/donor-responses { requestId, donorId, response: 'accepted'|'declined' }
    await new Promise((r) => setTimeout(r, 700));
    if (accepted) {
      setRespondedIds((p) => new Set(p).add(respondingTo.id));
      toast.success(`You've committed to respond to request ${respondingTo.requestId}. The hospital has been notified.`);
    } else {
      toast.info(`You declined request ${respondingTo.requestId}.`);
    }
    setRespondingTo(null);
  };

  return (
    <>
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h3 className="text-sm font-bold text-foreground">Nearby Blood Requests</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Matching your blood group (B+) within 10 km
            </p>
          </div>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
            disabled={isLoading}
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Request list */}
        <div className="divide-y divide-border">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 3 }, (_, i) => <RequestCardSkeleton key={`req-skel-${i}`} />)}
            </div>
          ) : MOCK_NEARBY_REQUESTS.length === 0 ? (
            <EmptyState variant="requests" />
          ) : (
            MOCK_NEARBY_REQUESTS.map((req) => (
              <RequestRow
                key={`nearby-req-${req.id}`}
                request={req}
                hasResponded={respondedIds.has(req.id)}
                onRespond={() => handleRespond(req)}
              />
            ))
          )}
        </div>
      </div>

      {/* Respond modal */}
      <Modal
        isOpen={!!respondingTo}
        onClose={() => setRespondingTo(null)}
        title="Respond to Blood Request"
        size="md"
      >
        {respondingTo && (
          <RespondModal
            request={respondingTo}
            onAccept={() => confirmResponse(true)}
            onDecline={() => confirmResponse(false)}
            onCancel={() => setRespondingTo(null)}
          />
        )}
      </Modal>
    </>
  );
}

function RequestRow({
  request,
  hasResponded,
  onRespond,
}: {
  request: NearbyRequest;
  hasResponded: boolean;
  onRespond: () => void;
}) {
  return (
    <div className={`px-5 py-4 hover:bg-muted/40 transition-colors ${request.isEmergency ? 'border-l-4 border-emergency' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <BloodGroupBadge group={request.bloodGroup} size="md" />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-bold text-foreground truncate">{request.hospitalName}</p>
              <PriorityBadge priority={request.priority} />
            </div>
            <p className="text-xs font-mono text-muted-foreground mt-0.5">{request.requestId}</p>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin size={11} />
                {request.distanceKm} km away
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock size={11} />
                {request.postedMinutesAgo < 60
                  ? `${request.postedMinutesAgo} min ago`
                  : `${Math.floor(request.postedMinutesAgo / 60)}h ago`}
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users size={11} />
                {request.respondedCount} responded
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed line-clamp-1">
              {request.notes}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <RequestStatusBadge status={request.status} />
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>{request.unitsRequired} unit{request.unitsRequired !== 1 ? 's' : ''} needed</span>
          </div>
        </div>
      </div>

      {/* Action */}
      <div className="flex items-center gap-2 mt-3">
        {hasResponded ? (
          <div className="flex items-center gap-1.5 text-xs text-success font-semibold">
            <CheckCircle size={13} />
            You committed to respond
          </div>
        ) : request.status === 'FULFILLED' || request.status === 'EXPIRED' ? (
          <span className="text-xs text-muted-foreground">Request closed</span>
        ) : (
          <>
            <button
              onClick={onRespond}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold btn-primary"
            >
              <CheckCircle size={12} />
              I Can Donate
            </button>
            <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <ChevronRight size={13} />
              View Details
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function RespondModal({
  request,
  onAccept,
  onDecline,
  onCancel,
}: {
  request: NearbyRequest;
  onAccept: () => void;
  onDecline: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-4">
      {/* Request summary */}
      <div className="p-4 rounded-xl bg-muted border border-border">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <BloodGroupBadge group={request.bloodGroup} size="md" />
            <div>
              <p className="text-sm font-bold text-foreground">{request.hospitalName}</p>
              <p className="text-xs font-mono text-muted-foreground">{request.requestId}</p>
            </div>
          </div>
          <PriorityBadge priority={request.priority} />
        </div>
        <div className="grid grid-cols-2 gap-2 mt-3">
          <div className="bg-card rounded-lg p-2.5 text-center border border-border">
            <p className="text-lg font-bold text-foreground font-tabular">{request.unitsRequired}</p>
            <p className="text-xs text-muted-foreground">units needed</p>
          </div>
          <div className="bg-card rounded-lg p-2.5 text-center border border-border">
            <p className="text-sm font-bold text-foreground">{request.distanceKm} km</p>
            <p className="text-xs text-muted-foreground">from you</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3 leading-relaxed">{request.notes}</p>
      </div>

      {/* Important notices */}
      <div className="space-y-2">
        <div className="flex items-start gap-2 p-3 rounded-xl bg-primary-light border border-blue-200">
          <CheckCircle size={13} className="text-primary flex-shrink-0 mt-0.5" />
          <p className="text-xs text-primary leading-relaxed">
            Committing to respond means you intend to visit the hospital. The hospital will confirm your eligibility and blood compatibility on arrival. You are not obligated to donate if deemed medically ineligible.
          </p>
        </div>
        <div className="flex items-start gap-2 p-3 rounded-xl bg-warning-bg border border-amber-200">
          <Clock size={13} className="text-warning flex-shrink-0 mt-0.5" />
          <p className="text-xs text-warning leading-relaxed">
            Required by: <strong>{request.requiredBy}</strong>. Please only commit if you can realistically arrive by this time.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={onDecline}
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold text-error border border-red-200 bg-error-bg hover:bg-red-100 transition-colors"
        >
          <XCircle size={15} />
          Can&apos;t Donate
        </button>
        <button
          onClick={onAccept}
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold btn-primary"
        >
          <CheckCircle size={15} />
          I Will Donate
        </button>
      </div>
      <button
        onClick={onCancel}
        className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        Decide later
      </button>
    </div>
  );
}