'use client';
import React, { useState } from 'react';
import { Zap, X, AlertTriangle, Loader2, CheckCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { BLOOD_GROUPS, BloodGroup } from '@/lib/constants';
import { toast } from 'sonner';

interface EmergencyRequestFABProps {
  bloodGroup: BloodGroup | '';
  location: string;
}

interface EmergencyFormData {
  patientName: string;
  bloodGroup: BloodGroup;
  unitsRequired: number;
  hospitalName: string;
  hospitalAddress: string;
  contactName: string;
  contactPhone: string;
  requiredBy: string;
  additionalNotes: string;
  consentAccurate: boolean;
}

export default function EmergencyRequestFAB({ bloodGroup, location }: EmergencyRequestFABProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [requestId, setRequestId] = useState('');

  return (
    <>
      {/* FAB button */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setIsOpen(true)}
          className="btn-emergency flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm shadow-lg"
          aria-label="Create emergency blood request"
        >
          <Zap size={18} strokeWidth={2.5} />
          Create Emergency Request
        </button>
      </div>

      {/* Modal overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(3px)' }}
        >
          <div className="bg-card rounded-2xl shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto scrollbar-thin slide-up">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emergency-bg flex items-center justify-center">
                  <Zap size={16} className="text-emergency" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">Emergency Blood Request</h2>
                  <p className="text-xs text-muted-foreground">Request ID will be auto-generated</p>
                </div>
              </div>
              <button
                onClick={() => { setIsOpen(false); setSubmitted(false); }}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5">
              {submitted ? (
                <SubmissionSuccess requestId={requestId} onClose={() => { setIsOpen(false); setSubmitted(false); }} />
              ) : (
                <EmergencyForm
                  defaultBloodGroup={bloodGroup}
                  defaultLocation={location}
                  onSuccess={(id) => { setRequestId(id); setSubmitted(true); }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function EmergencyForm({
  defaultBloodGroup,
  defaultLocation,
  onSuccess,
}: {
  defaultBloodGroup: BloodGroup | '';
  defaultLocation: string;
  onSuccess: (id: string) => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EmergencyFormData>({
    defaultValues: {
      bloodGroup: defaultBloodGroup || undefined,
      hospitalAddress: defaultLocation,
      unitsRequired: 1,
    },
  });

  const onSubmit = async (data: EmergencyFormData) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bloodGroup: data.bloodGroup,
          priority: 'EMERGENCY',
          hospital: data.hospitalName,
          unitsNeeded: Number(data.unitsRequired),
          contactNumber: data.contactPhone,
          city: data.hospitalAddress || undefined,
          patientName: data.patientName || data.contactName || undefined,
          notes: [
            data.additionalNotes,
            data.requiredBy ? `Required by: ${data.requiredBy}` : '',
            data.contactName ? `Contact: ${data.contactName}` : '',
          ]
            .filter(Boolean)
            .join(' | ') || undefined,
        }),
      });

      const result = await res.json().catch(() => null);

      if (!res.ok || !result?.success) {
        const errorText =
          result?.error ||
          (res.status === 401
            ? 'Please log in to submit an emergency blood request.'
            : res.status === 429
            ? 'Too many requests. Please wait a moment before trying again.'
            : 'Failed to create emergency request. Please try again.');
        setErrorMessage(errorText);
        toast.error(errorText);
        return;
      }

      const createdRequestId =
        result?.data?.request?.requestId ||
        result?.data?.request?.id ||
        'Created';

      toast.success(`Emergency request ${createdRequestId} created. Matching donors notified.`);
      onSuccess(createdRequestId);
    } catch (err: any) {
      console.error('Error submitting emergency request:', err);
      const msg = err?.message || 'Network error submitting request. Please try again.';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {/* Error alert */}
      {errorMessage && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-error">
          <AlertTriangle size={15} className="text-error flex-shrink-0 mt-0.5" />
          <p className="text-xs leading-relaxed">{errorMessage}</p>
        </div>
      )}

      {/* Emergency disclaimer */}
      <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-emergency-bg border border-red-200">
        <AlertTriangle size={15} className="text-emergency flex-shrink-0 mt-0.5" />
        <p className="text-xs text-emergency leading-relaxed">
          <strong>Medical emergency?</strong> Call <strong>112</strong> first. This platform coordinates blood — it does not dispatch ambulances or provide medical care. All blood eligibility decisions are made by hospital staff only.
        </p>
      </div>

      {/* Blood group + units */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1.5">
            Blood Group <span className="text-error">*</span>
          </label>
          <select
            className={`input-field ${errors.bloodGroup ? 'error' : ''}`}
            {...register('bloodGroup', { required: 'Blood group is required' })}
          >
            <option value="">Select group</option>
            {BLOOD_GROUPS.map((bg) => (
              <option key={`emg-bg-${bg}`} value={bg}>{bg}</option>
            ))}
          </select>
          {errors.bloodGroup && (
            <p className="text-xs text-error mt-1">{errors.bloodGroup.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1.5">
            Units Required <span className="text-error">*</span>
          </label>
          <input
            type="number"
            min={1}
            max={10}
            className={`input-field ${errors.unitsRequired ? 'error' : ''}`}
            {...register('unitsRequired', {
              required: 'Required',
              min: { value: 1, message: 'Minimum 1 unit' },
              max: { value: 10, message: 'Max 10 units per request' },
            })}
          />
          {errors.unitsRequired && (
            <p className="text-xs text-error mt-1">{errors.unitsRequired.message}</p>
          )}
        </div>
      </div>

      {/* Hospital name */}
      <div>
        <label className="block text-sm font-semibold text-foreground mb-1.5">
          Hospital / Facility Name <span className="text-error">*</span>
        </label>
        <input
          type="text"
          placeholder="Full name of hospital or clinic"
          className={`input-field ${errors.hospitalName ? 'error' : ''}`}
          {...register('hospitalName', { required: 'Hospital name is required' })}
        />
        {errors.hospitalName && (
          <p className="text-xs text-error mt-1">{errors.hospitalName.message}</p>
        )}
      </div>

      {/* Hospital address */}
      <div>
        <label className="block text-sm font-semibold text-foreground mb-1.5">
          Hospital Address
        </label>
        <input
          type="text"
          placeholder="Ward, area, city"
          className="input-field"
          {...register('hospitalAddress')}
        />
      </div>

      {/* Contact person */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1.5">
            Contact Person <span className="text-error">*</span>
          </label>
          <input
            type="text"
            placeholder="Name of coordinator"
            className={`input-field ${errors.contactName ? 'error' : ''}`}
            {...register('contactName', { required: 'Contact name is required' })}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1.5">
            Contact Phone <span className="text-error">*</span>
          </label>
          <input
            type="tel"
            placeholder="10-digit mobile"
            className={`input-field ${errors.contactPhone ? 'error' : ''}`}
            {...register('contactPhone', {
              required: 'Phone is required',
              pattern: { value: /^[6-9]\d{9}$/, message: 'Invalid number' },
            })}
          />
        </div>
      </div>

      {/* Required by */}
      <div>
        <label className="block text-sm font-semibold text-foreground mb-1.5">
          Required By (Date &amp; Time)
        </label>
        <input
          type="datetime-local"
          className="input-field"
          {...register('requiredBy')}
        />
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-semibold text-foreground mb-1.5">
          Additional Notes
        </label>
        <textarea
          rows={2}
          placeholder="e.g. Post-surgery, thalassemia patient, specific ward details"
          className="input-field resize-none"
          {...register('additionalNotes')}
        />
      </div>

      {/* Consent */}
      <label className="flex items-start gap-2.5 cursor-pointer">
        <input
          type="checkbox"
          className="mt-0.5 accent-emergency w-4 h-4"
          {...register('consentAccurate', { required: 'You must confirm the information is accurate' })}
        />
        <span className="text-xs text-muted-foreground leading-relaxed">
          I confirm the information above is accurate. I understand that BloodConnect coordinates blood resources only — all medical eligibility decisions will be made by hospital staff.
        </span>
      </label>
      {errors.consentAccurate && (
        <p className="text-xs text-error flex items-center gap-1">
          <AlertTriangle size={11} />
          {errors.consentAccurate.message}
        </p>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="btn-emergency w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
      >
        {isLoading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Creating Request…
          </>
        ) : (
          <>
            <Zap size={16} />
            Submit Emergency Request
          </>
        )}
      </button>
    </form>
  );
}

function SubmissionSuccess({ requestId, onClose }: { requestId: string; onClose: () => void }) {
  return (
    <div className="text-center py-4 space-y-4">
      <div className="w-16 h-16 rounded-full bg-success-bg flex items-center justify-center mx-auto">
        <CheckCircle size={32} className="text-success" />
      </div>
      <div>
        <h3 className="text-lg font-bold text-foreground mb-1">Request Created</h3>
        <p className="text-sm text-muted-foreground">
          Your emergency blood request has been submitted and matched donors are being notified.
        </p>
      </div>
      <div className="bg-muted rounded-xl p-4">
        <p className="text-xs text-muted-foreground mb-1">Request ID</p>
        <p className="text-xl font-bold text-foreground font-mono tracking-wide">{requestId}</p>
        <p className="text-xs text-muted-foreground mt-1">Share this ID with hospital staff to track the request.</p>
      </div>
      <div className="p-3 rounded-xl bg-warning-bg border border-amber-200 text-left">
        <p className="text-xs text-warning leading-relaxed">
          Donors will be notified. A hospital or blood bank staff member must confirm blood compatibility before any transfusion. Monitor request status in your dashboard.
        </p>
      </div>
      <button
        onClick={onClose}
        className="btn-primary w-full py-2.5 rounded-xl font-semibold text-sm"
      >
        View in Dashboard
      </button>
    </div>
  );
}