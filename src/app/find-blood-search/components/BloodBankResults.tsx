'use client';
import React, { useState, useEffect } from 'react';
import { MapPin, Phone, Clock, ChevronDown, ChevronUp, ExternalLink, CheckCircle, AlertTriangle } from 'lucide-react';
import { InventoryStatusBadge } from '@/components/ui/Badge';
import { SearchResultCardSkeleton } from '@/components/ui/LoadingSkeleton';
import EmptyState from '@/components/ui/EmptyState';
import { InventoryStatus, BloodGroup } from '@/lib/constants';
import { toast } from 'sonner';

export interface BloodBankInventoryItem {
  bloodGroup: BloodGroup;
  units: number;
  status: InventoryStatus;
  lastUpdated: string | null;
}

export interface BloodBankResult {
  id: string;
  name: string;
  type: string;
  address: string;
  city: string;
  distanceKm: number;
  phone: string;
  contact: string;
  operatingHours: string;
  isVerified: boolean;
  isOpen: boolean;
  inventory: BloodBankInventoryItem[];
  avgResponseTime: string;
  updatedAt?: string;
}

interface BloodBankResultsProps {
  bloodGroup: BloodGroup | '';
  location?: string;
  isLoading?: boolean;
  showCompatible?: boolean;
  banks?: BloodBankResult[];
}

export default function BloodBankResults({
  bloodGroup,
  location = '',
  isLoading: externalLoading = false,
  banks: propBanks,
}: BloodBankResultsProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [banks, setBanks] = useState<BloodBankResult[]>(propBanks || []);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (propBanks && propBanks.length > 0) {
      setBanks(propBanks);
      return;
    }

    let active = true;
    setLoading(true);

    const queryParams = new URLSearchParams();
    if (bloodGroup) queryParams.set('bloodGroup', bloodGroup);
    if (location) queryParams.set('city', location);

    fetch(`/api/blood-banks?${queryParams.toString()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data?.data) {
          setBanks(data.data);
        }
      })
      .catch((err) => console.error('Error fetching blood banks:', err))
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [bloodGroup, location, propBanks]);

  const isLoading = externalLoading || loading;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }, (_, i) => (
          <SearchResultCardSkeleton key={`bb-skel-${i}`} />
        ))}
      </div>
    );
  }

  const filtered = bloodGroup
    ? banks.filter((bb) =>
        bb.inventory.some(
          (inv) => inv.bloodGroup === bloodGroup && inv.status !== 'out_of_stock'
        )
      )
    : banks;

  if (filtered.length === 0) {
    return (
      <EmptyState
        variant="search"
        title="No blood banks with available stock"
        description={`No verified blood banks have ${bloodGroup || 'matching'} stock in the database. Try expanding search parameters or selecting a different location.`}
      />
    );
  }

  return (
    <div className="space-y-3">
      {filtered.map((bb) => (
        <BloodBankCard
          key={`bb-${bb.id}`}
          bank={bb}
          targetBloodGroup={bloodGroup}
          isExpanded={expandedId === bb.id}
          onToggle={() => setExpandedId((p) => (p === bb.id ? null : bb.id))}
        />
      ))}
    </div>
  );
}

function BloodBankCard({
  bank,
  targetBloodGroup,
  isExpanded,
  onToggle,
}: {
  bank: BloodBankResult;
  targetBloodGroup: BloodGroup | '';
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const targetInv = targetBloodGroup
    ? bank.inventory.find((i) => i.bloodGroup === targetBloodGroup)
    : null;

  const phoneNum = bank.phone || bank.contact;

  const handleContact = () => {
    if (phoneNum) {
      toast.success(`Calling ${bank.name}: ${phoneNum}`);
      window.location.href = `tel:${phoneNum.replace(/\s+/g, '')}`;
    } else {
      toast.error('No contact phone number available for this facility.');
    }
  };

  const openDirections = () => {
    const query = encodeURIComponent(`${bank.name}, ${bank.address}, ${bank.city}`);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${query}`, '_blank');
  };

  return (
    <div
      className={`bg-card border rounded-2xl overflow-hidden card-hover transition-all duration-200 ${
        targetInv?.status === 'critical' || targetInv?.status === 'out_of_stock'
          ? 'border-red-200'
          : 'border-border'
      }`}
    >
      {/* Card header */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            {/* Icon */}
            <div className="w-11 h-11 rounded-xl bg-primary-light flex items-center justify-center flex-shrink-0">
              <span className="text-lg">🏥</span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-foreground">{bank.name}</h3>
                {bank.isVerified && (
                  <CheckCircle size={14} className="text-success flex-shrink-0" />
                )}
                {!bank.isOpen && (
                  <span className="text-xs font-semibold text-warning bg-warning-bg border border-amber-200 rounded-full px-2 py-0.5">
                    Closed
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{bank.type}</p>
              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                <MapPin size={11} />
                <span className="truncate">{bank.address}, {bank.city}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            <span className="text-sm font-bold text-primary font-tabular">
              {bank.distanceKm ? `${bank.distanceKm} km` : 'Near you'}
            </span>
            {targetInv && <InventoryStatusBadge status={targetInv.status} />}
          </div>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-4 mt-3 flex-wrap">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock size={11} />
            <span>{bank.operatingHours}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>Phone: {phoneNum}</span>
          </div>
          {targetInv && targetInv.units > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold text-foreground font-tabular">
                {targetInv.units}
              </span>
              <span className="text-xs text-muted-foreground">units available</span>
            </div>
          )}
        </div>

        {/* Target blood group warning */}
        {targetInv?.status === 'critical' && (
          <div className="flex items-center gap-2 mt-3 p-2.5 rounded-lg bg-critical-bg border border-red-200">
            <AlertTriangle size={13} className="text-critical flex-shrink-0" />
            <p className="text-xs text-critical font-semibold">
              Only {targetInv.units} unit{targetInv.units !== 1 ? 's' : ''} remaining — contact immediately
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          <button
            onClick={handleContact}
            className="btn-primary flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold"
          >
            <Phone size={13} />
            Contact Blood Bank
          </button>
          <button
            onClick={onToggle}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border border-border"
          >
            {isExpanded ? (
              <>
                <ChevronUp size={13} />
                Hide Inventory
              </>
            ) : (
              <>
                <ChevronDown size={13} />
                Full Inventory
              </>
            )}
          </button>
          <button
            onClick={openDirections}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors ml-auto"
          >
            <ExternalLink size={12} />
            Directions
          </button>
        </div>
      </div>

      {/* Expanded inventory */}
      {isExpanded && (
        <div className="border-t border-border bg-muted/30 px-5 py-4 fade-in">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Full Blood Inventory
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {bank.inventory.map((inv) => (
              <div
                key={`inv-${bank.id}-${inv.bloodGroup}`}
                className={`rounded-xl border p-3 text-center ${
                  inv.status === 'available'
                    ? 'bg-success-bg border-green-200'
                    : inv.status === 'low'
                    ? 'bg-warning-bg border-amber-200'
                    : inv.status === 'critical'
                    ? 'bg-critical-bg border-red-200'
                    : 'bg-muted border-border'
                } ${inv.bloodGroup === targetBloodGroup ? 'ring-2 ring-primary ring-offset-1' : ''}`}
              >
                <p
                  className={`text-base font-extrabold font-tabular ${
                    inv.status === 'out_of_stock' ? 'text-muted-foreground' : 'text-foreground'
                  }`}
                >
                  {inv.bloodGroup}
                </p>
                <p
                  className={`text-xl font-bold font-tabular mt-0.5 ${
                    inv.status === 'available'
                      ? 'text-success'
                      : inv.status === 'low'
                      ? 'text-warning'
                      : inv.status === 'critical'
                      ? 'text-critical'
                      : 'text-muted-foreground'
                  }`}
                >
                  {inv.units}
                </p>
                <p className="text-xs text-muted-foreground">units</p>
                <div className="mt-1.5">
                  <InventoryStatusBadge status={inv.status} />
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Last updated: {bank.updatedAt ? new Date(bank.updatedAt).toLocaleString() : 'Recently'}. Verify availability by phone before visiting.
          </p>
        </div>
      )}
    </div>
  );
}
