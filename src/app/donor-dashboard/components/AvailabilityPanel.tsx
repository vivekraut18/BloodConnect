'use client';
import React, { useState } from 'react';
import { CheckCircle, Clock, BellOff, ChevronDown, AlertTriangle } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { DonorAvailabilityStatus } from '@/lib/constants';
import { toast } from 'sonner';

const STATUS_OPTIONS: {
  value: DonorAvailabilityStatus;
  label: string;
  description: string;
  Icon: React.ElementType;
  colorClass: string;
  dotClass: string;
}[] = [
  {
    value: 'available',
    label: 'Available',
    description: 'I am eligible and available to donate if needed.',
    Icon: CheckCircle,
    colorClass: 'text-success',
    dotClass: 'bg-success',
  },
  {
    value: 'temporarily_unavailable',
    label: 'Temporarily Unavailable',
    description: 'I cannot donate right now but will be available soon.',
    Icon: Clock,
    colorClass: 'text-warning',
    dotClass: 'bg-warning',
  },
  {
    value: 'do_not_disturb',
    label: 'Do Not Disturb',
    description: 'Do not send me any donation requests at this time.',
    Icon: BellOff,
    colorClass: 'text-muted-foreground',
    dotClass: 'bg-muted-foreground',
  },
];

export default function AvailabilityPanel() {
  const [status, setStatus] = useState<DonorAvailabilityStatus>('available');
  const [pendingStatus, setPendingStatus] = useState<DonorAvailabilityStatus | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const currentOpt = STATUS_OPTIONS.find((o) => o.value === status)!;

  const handleStatusChange = (newStatus: DonorAvailabilityStatus) => {
    setDropdownOpen(false);
    if (newStatus === status) return;
    setPendingStatus(newStatus);
  };

  const confirmChange = async () => {
    if (!pendingStatus) return;
    // BACKEND INTEGRATION: PUT /api/donors/me/availability { status: pendingStatus }
    await new Promise((r) => setTimeout(r, 600));
    setStatus(pendingStatus);
    setPendingStatus(null);
    const opt = STATUS_OPTIONS.find((o) => o.value === pendingStatus)!;
    toast.success(`Availability updated to "${opt.label}"`);
  };

  const pendingOpt = pendingStatus ? STATUS_OPTIONS.find((o) => o.value === pendingStatus) : null;

  return (
    <>
      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="text-sm font-bold text-foreground mb-3">Availability Status</h3>
        <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
          Your availability is shown to requesters searching for donors. Update this whenever your status changes. Your exact location is never shared.
        </p>

        {/* Current status */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen((p) => !p)}
            className={`w-full flex items-center justify-between gap-3 p-3.5 rounded-xl border-2 transition-all duration-150 ${
              status === 'available' ?'border-green-200 bg-success-bg'
                : status === 'temporarily_unavailable' ?'border-amber-200 bg-warning-bg' :'border-border bg-muted'
            }`}
            aria-expanded={dropdownOpen}
            aria-haspopup="listbox"
          >
            <div className="flex items-center gap-2.5">
              <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${currentOpt.dotClass} ${status === 'available' ? 'blood-drop-pulse' : ''}`} />
              <div className="text-left">
                <p className={`text-sm font-bold ${currentOpt.colorClass}`}>{currentOpt.label}</p>
                <p className="text-xs text-muted-foreground">{currentOpt.description}</p>
              </div>
            </div>
            <ChevronDown
              size={16}
              className={`text-muted-foreground flex-shrink-0 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Dropdown */}
          {dropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-card border border-border rounded-xl shadow-lg z-20 overflow-hidden fade-in">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={`avail-opt-${opt.value}`}
                  onClick={() => handleStatusChange(opt.value)}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left border-b border-border last:border-0 ${
                    opt.value === status ? 'bg-muted' : ''
                  }`}
                  role="option"
                  aria-selected={opt.value === status}
                >
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${opt.dotClass}`} />
                  <div>
                    <p className={`text-sm font-semibold ${opt.colorClass}`}>{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.description}</p>
                  </div>
                  {opt.value === status && (
                    <CheckCircle size={14} className="text-success ml-auto" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Next eligible */}
        <div className="mt-3 p-3 rounded-xl bg-error-bg border border-red-200">
          <div className="flex items-center gap-2">
            <AlertTriangle size={13} className="text-critical flex-shrink-0" />
            <p className="text-xs text-critical font-semibold">Not yet eligible to donate</p>
          </div>
          <p className="text-xs text-critical mt-1 ml-5">
            Next eligible: <strong>10 Dec 2026</strong> (88 days remaining). Last donation: 10 Sep 2026.
          </p>
        </div>
      </div>

      {/* Confirm modal */}
      <Modal
        isOpen={!!pendingStatus}
        onClose={() => setPendingStatus(null)}
        title="Update Availability Status"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            You are changing your availability from{' '}
            <strong className={currentOpt.colorClass}>{currentOpt.label}</strong> to{' '}
            <strong className={pendingOpt?.colorClass}>{pendingOpt?.label}</strong>.
          </p>
          {pendingStatus === 'do_not_disturb' && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-warning-bg border border-amber-200">
              <AlertTriangle size={14} className="text-warning flex-shrink-0 mt-0.5" />
              <p className="text-xs text-warning leading-relaxed">
                Do Not Disturb will stop all donation request notifications, including urgent ones. Emergency alerts will still be delivered.
              </p>
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => setPendingStatus(null)}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground border border-border hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmChange}
              className="flex-1 btn-primary py-2.5 rounded-xl text-sm font-semibold"
            >
              Confirm Change
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}