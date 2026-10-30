'use client';
import React, { useState, useEffect } from 'react';
import { MapPin, Clock, Users, CheckCircle, XCircle, RefreshCw, Loader2 } from 'lucide-react';
import { BloodGroupBadge, PriorityBadge, RequestStatusBadge } from '@/components/ui/Badge';
import { RequestCardSkeleton } from '@/components/ui/LoadingSkeleton';
import EmptyState from '@/components/ui/EmptyState';
import Modal from '@/components/ui/Modal';
import { RequestPriority, RequestStatus } from '@/lib/constants';
import { toast } from 'sonner';

export interface NearbyRequest {
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

export interface NearbyRequestsFeedProps {
  scope?: 'all' | 'mine';
  title?: string;
  subtitle?: string;
}

export default function NearbyRequestsFeed({
  scope = 'all',
  title,
  subtitle,
}: NearbyRequestsFeedProps) {
  const [requests, setRequests] = useState<NearbyRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isResponding, setIsResponding] = useState(false);
  const [respondingTo, setRespondingTo] = useState<NearbyRequest | null>(null);
  const [respondedIds, setRespondedIds] = useState<Set<string>>(new Set());

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const endpoint = scope === 'mine' ? '/api/requests?scope=mine' : '/api/requests';
      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        if (data?.data?.requests) {
          const formatted = data.data.requests.map((r: any) => {
            const minutesAgo = Math.floor(
              (Date.now() - new Date(r.createdAt || Date.now()).getTime()) / 60000
            );
            return {
              id: r.id,
              requestId: r.requestId,
              bloodGroup: r.bloodGroup,
              unitsRequired: r.unitsNeeded || 1,
              hospitalName: r.hospital,
              distanceKm: 2.5,
              priority: r.priority as RequestPriority,
              status: r.status as RequestStatus,
              respondedCount: r.respondedCount ?? 0,
              requiredBy: 'As soon as possible',
              postedMinutesAgo: minutesAgo > 0 ? minutesAgo : 5,
              isEmergency: r.priority === 'EMERGENCY',
              notes: r.notes || `${r.bloodGroup} needed at ${r.hospital}.`,
            };
          });
          setRequests(formatted);

          const initialResponded = new Set<string>();
          data.data.requests.forEach((r: any) => {
            if (r.hasResponded || r.userResponseStatus === 'accepted') {
              initialResponded.add(r.id);
            }
          });
          setRespondedIds(initialResponded);
        }
      }
    } catch (err) {
      console.error('Error fetching requests:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [scope]);

  const handleRespond = (req: NearbyRequest) => setRespondingTo(req);

  const confirmResponse = async (accepted: boolean) => {
    if (!respondingTo || isResponding) return;
    setIsResponding(true);

    try {
      const res = await fetch(`/api/requests/${respondingTo.id}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: accepted ? 'accepted' : 'declined',
        }),
      });

      const result = await res.json().catch(() => null);

      if (!res.ok || !result?.success) {
        const errorText =
          result?.error ||
          (res.status === 401
            ? 'Please log in to respond to blood requests.'
            : res.status === 403
            ? 'Only registered donors can respond to requests.'
            : res.status === 409
            ? `You have already responded to request ${respondingTo.requestId}.`
            : 'Failed to record response. Please try again.');
        toast.error(errorText);
        return;
      }

      if (accepted) {
        setRespondedIds((prev) => new Set(prev).add(respondingTo.id));
        setRequests((prev) =>
          prev.map((req) =>
            req.id === respondingTo.id
              ? {
                  ...req,
                  respondedCount: req.respondedCount + 1,
                  status: result?.data?.requestStatus || req.status,
                }
              : req
          )
        );
        toast.success(`You committed to respond to request ${respondingTo.requestId}.`);
      } else {
        toast.info(`You declined request ${respondingTo.requestId}.`);
      }

      setRespondingTo(null);
    } catch (err: any) {
      console.error('Error confirming donor response:', err);
      toast.error('Network error. Please try again.');
    } finally {
      setIsResponding(false);
    }
  };

  return (
    <>
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h3 className="text-sm font-bold text-foreground">
              {title || (scope === 'mine' ? 'My Blood Requests' : 'Nearby Blood Requests')}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {subtitle ||
                (scope === 'mine'
                  ? 'Blood requests created and requested by your account'
                  : 'Active blood requests in your region from Supabase DB')}
            </p>
          </div>
          <button
            onClick={fetchRequests}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
            disabled={isLoading}
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Request list */}
        <div className="divide-y border-border">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 3 }, (_, i) => <RequestCardSkeleton key={`req-skel-${i}`} />)}
            </div>
          ) : requests.length === 0 ? (
            <EmptyState
              variant="requests"
              title={scope === 'mine' ? 'No blood requests found' : 'No active requests right now'}
              description={
                scope === 'mine'
                  ? "You haven't submitted any emergency blood requests yet."
                  : 'Check back soon or update your radius filters.'
              }
            />
          ) : (
            requests.map((req) => (
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
        onClose={() => !isResponding && setRespondingTo(null)}
        title="Respond to Blood Request"
        size="md"
      >
        {respondingTo && (
          <RespondModal
            request={respondingTo}
            isSubmitting={isResponding}
            onAccept={() => confirmResponse(true)}
            onDecline={() => confirmResponse(false)}
            onCancel={() => !isResponding && setRespondingTo(null)}
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
          <button
            onClick={onRespond}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold btn-primary"
          >
            <CheckCircle size={12} />
            I Can Donate
          </button>
        )}
      </div>
    </div>
  );
}

function RespondModal({
  request,
  isSubmitting = false,
  onAccept,
  onDecline,
  onCancel,
}: {
  request: NearbyRequest;
  isSubmitting?: boolean;
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

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={onDecline}
          disabled={isSubmitting}
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold text-error border border-red-200 bg-error-bg hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <XCircle size={15} />
          Can&apos;t Donate
        </button>
        <button
          onClick={onAccept}
          disabled={isSubmitting}
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              Recording…
            </>
          ) : (
            <>
              <CheckCircle size={15} />
              I Will Donate
            </>
          )}
        </button>
      </div>
      <button
        onClick={onCancel}
        disabled={isSubmitting}
        className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
      >
        Decide later
      </button>
    </div>
  );
}