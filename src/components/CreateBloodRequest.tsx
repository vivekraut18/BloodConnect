'use client';
import React, { useState } from 'react';
import { Droplets, X, AlertTriangle, Loader2, CheckCircle, Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { BLOOD_GROUPS, BloodGroup } from '@/lib/constants';
import { toast } from 'sonner';

interface CreateBloodRequestProps {
  /** Optional callback after a request is successfully created */
  onCreated?: (requestId: string) => void;
  /** Whether to render the trigger button inline or as a FAB */
  variant?: 'button' | 'fab';
  /** Extra CSS classes for the trigger button */
  className?: string;
}

interface BloodRequestFormData {
  patientName: string;
  bloodGroup: BloodGroup;
  unitsNeeded: number;
  hospital: string;
  city: string;
  contactNumber: string;
  priority: 'EMERGENCY' | 'URGENT' | 'STANDARD';
  notes: string;
  consentAccurate: boolean;
}

export default function CreateBloodRequest({
  onCreated,
  variant = 'button',
  className = '',
}: CreateBloodRequestProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [requestId, setRequestId] = useState('');

  const handleClose = () => {
    setIsOpen(false);
    setSubmitted(false);
  };

  return (
    <>
      {/* Trigger */}
      {variant === 'fab' ? (
        <div className="fixed bottom-6 right-6 z-40">
          <button
            onClick={() => setIsOpen(true)}
            className={`btn-primary flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm shadow-lg ${className}`}
            aria-label="Create blood request"
          >
            <Plus size={18} strokeWidth={2.5} />
            Request Blood
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className={`btn-primary flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm ${className}`}
          aria-label="Create blood request"
        >
          <Plus size={16} />
          Request Blood
        </button>
      )}

      {/* Modal overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(3px)' }}
        >
          <div className="bg-card rounded-2xl shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto scrollbar-thin slide-up">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary-light flex items-center justify-center">
                  <Droplets size={16} className="text-primary" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">Request Blood</h2>
                  <p className="text-xs text-muted-foreground">Request ID auto-generated</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5">
              {submitted ? (
                <SubmissionSuccess requestId={requestId} onClose={handleClose} />
              ) : (
                <BloodRequestForm
                  onSuccess={(id) => {
                    setRequestId(id);
                    setSubmitted(true);
                    onCreated?.(id);
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function BloodRequestForm({ onSuccess }: { onSuccess: (id: string) => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BloodRequestFormData>({
    defaultValues: {
      unitsNeeded: 1,
      priority: 'STANDARD',
    },
  });

  const onSubmit = async (data: BloodRequestFormData) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bloodGroup: data.bloodGroup,
          priority: data.priority,
          hospital: data.hospital,
          unitsNeeded: Number(data.unitsNeeded),
          contactNumber: data.contactNumber,
          city: data.city || undefined,
          patientName: data.patientName || undefined,
          notes: data.notes || undefined,
        }),
      });

      const result = await res.json().catch(() => null);

      if (!res.ok || !result?.success) {
        const errorText =
          result?.error ||
          (res.status === 401
            ? 'Please log in to create a blood request.'
            : res.status === 429
            ? 'Too many requests. Please wait before trying again.'
            : 'Failed to create blood request. Please try again.');
        setErrorMessage(errorText);
        toast.error(errorText);
        return;
      }

      const createdRequestId =
        result?.data?.request?.requestId || result?.data?.request?.id || 'Created';

      toast.success(`Blood request ${createdRequestId} created successfully.`);
      onSuccess(createdRequestId);
    } catch (err: any) {
      console.error('Error submitting blood request:', err);
      const msg = err?.message || 'Network error. Please try again.';
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

      {/* Patient name */}
      <div>
        <label className="block text-sm font-semibold text-foreground mb-1.5">
          Patient Name
        </label>
        <input
          type="text"
          placeholder="Name of patient requiring blood"
          className="input-field"
          {...register('patientName')}
        />
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
              <option key={`create-bg-${bg}`} value={bg}>
                {bg}
              </option>
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
            className={`input-field ${errors.unitsNeeded ? 'error' : ''}`}
            {...register('unitsNeeded', {
              required: 'Required',
              min: { value: 1, message: 'Minimum 1 unit' },
              max: { value: 10, message: 'Max 10 units per request' },
            })}
          />
          {errors.unitsNeeded && (
            <p className="text-xs text-error mt-1">{errors.unitsNeeded.message}</p>
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
          className={`input-field ${errors.hospital ? 'error' : ''}`}
          {...register('hospital', { required: 'Hospital name is required' })}
        />
        {errors.hospital && (
          <p className="text-xs text-error mt-1">{errors.hospital.message}</p>
        )}
      </div>

      {/* City / Location */}
      <div>
        <label className="block text-sm font-semibold text-foreground mb-1.5">
          City / Location
        </label>
        <input
          type="text"
          placeholder="City or area (e.g. Mumbai, Andheri East)"
          className="input-field"
          {...register('city')}
        />
      </div>

      {/* Contact number */}
      <div>
        <label className="block text-sm font-semibold text-foreground mb-1.5">
          Contact Number <span className="text-error">*</span>
        </label>
        <input
          type="tel"
          placeholder="10-digit mobile number"
          className={`input-field ${errors.contactNumber ? 'error' : ''}`}
          {...register('contactNumber', {
            required: 'Contact number is required',
            pattern: { value: /^[6-9]\d{9}$/, message: 'Enter a valid 10-digit number' },
          })}
        />
        {errors.contactNumber && (
          <p className="text-xs text-error mt-1">{errors.contactNumber.message}</p>
        )}
      </div>

      {/* Priority */}
      <div>
        <label className="block text-sm font-semibold text-foreground mb-1.5">
          Priority Level <span className="text-error">*</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(['STANDARD', 'URGENT', 'EMERGENCY'] as const).map((p) => (
            <label
              key={`priority-${p}`}
              className="flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <input
                type="radio"
                value={p}
                className="sr-only peer"
                {...register('priority', { required: 'Priority is required' })}
              />
              <span
                className={`w-full text-center px-3 py-2 rounded-lg text-xs font-bold border-2 transition-all duration-150 peer-checked:shadow-sm ${
                  p === 'EMERGENCY'
                    ? 'peer-checked:bg-emergency peer-checked:text-white peer-checked:border-emergency border-border text-muted-foreground hover:border-emergency/50'
                    : p === 'URGENT'
                    ? 'peer-checked:bg-warning peer-checked:text-white peer-checked:border-warning border-border text-muted-foreground hover:border-warning/50'
                    : 'peer-checked:bg-primary peer-checked:text-white peer-checked:border-primary border-border text-muted-foreground hover:border-primary/50'
                }`}
              >
                {p}
              </span>
            </label>
          ))}
        </div>
        {errors.priority && (
          <p className="text-xs text-error mt-1">{errors.priority.message}</p>
        )}
      </div>

      {/* Additional notes */}
      <div>
        <label className="block text-sm font-semibold text-foreground mb-1.5">
          Additional Information
        </label>
        <textarea
          rows={2}
          placeholder="e.g. Post-surgery, thalassemia patient, specific ward details"
          className="input-field resize-none"
          {...register('notes')}
        />
      </div>

      {/* Consent */}
      <label className="flex items-start gap-2.5 cursor-pointer">
        <input
          type="checkbox"
          className="mt-0.5 accent-primary w-4 h-4"
          {...register('consentAccurate', {
            required: 'You must confirm the information is accurate',
          })}
        />
        <span className="text-xs text-muted-foreground leading-relaxed">
          I confirm the information above is accurate. I understand that BloodConnect coordinates
          blood resources only — all medical eligibility decisions will be made by hospital staff.
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
        className="btn-primary w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
      >
        {isLoading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Creating Request…
          </>
        ) : (
          <>
            <Droplets size={16} />
            Submit Blood Request
          </>
        )}
      </button>
    </form>
  );
}

function SubmissionSuccess({
  requestId,
  onClose,
}: {
  requestId: string;
  onClose: () => void;
}) {
  return (
    <div className="text-center py-4 space-y-4">
      <div className="w-16 h-16 rounded-full bg-success-bg flex items-center justify-center mx-auto">
        <CheckCircle size={32} className="text-success" />
      </div>
      <div>
        <h3 className="text-lg font-bold text-foreground mb-1">Request Created</h3>
        <p className="text-sm text-muted-foreground">
          Your blood request has been submitted. Compatible donors in your area will be notified.
        </p>
      </div>
      <div className="bg-muted rounded-xl p-4">
        <p className="text-xs text-muted-foreground mb-1">Request ID</p>
        <p className="text-xl font-bold text-foreground font-mono tracking-wide">{requestId}</p>
        <p className="text-xs text-muted-foreground mt-1">
          Share this ID with hospital staff to track the request.
        </p>
      </div>
      <div className="p-3 rounded-xl bg-warning-bg border border-amber-200 text-left">
        <p className="text-xs text-warning leading-relaxed">
          Donors will be notified. A hospital or blood bank staff member must confirm blood
          compatibility before any transfusion. Monitor request status in your dashboard.
        </p>
      </div>
      <button
        onClick={onClose}
        className="btn-primary w-full py-2.5 rounded-xl font-semibold text-sm"
      >
        Done
      </button>
    </div>
  );
}
