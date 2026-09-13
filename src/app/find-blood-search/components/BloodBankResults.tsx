'use client';
import React, { useState } from 'react';
import { MapPin, Phone, Clock, ChevronDown, ChevronUp, ExternalLink, CheckCircle, AlertTriangle } from 'lucide-react';
import { InventoryStatusBadge } from '@/components/ui/Badge';
import { SearchResultCardSkeleton } from '@/components/ui/LoadingSkeleton';
import EmptyState from '@/components/ui/EmptyState';
import { InventoryStatus, BloodGroup } from '@/lib/constants';
import { toast } from 'sonner';

interface BloodBankInventoryItem {
  bloodGroup: BloodGroup;
  units: number;
  status: InventoryStatus;
  lastUpdated: string;
}

interface BloodBankResult {
  id: string;
  name: string;
  type: string;
  address: string;
  distanceKm: number;
  phone: string;
  operatingHours: string;
  isVerified: boolean;
  isOpen: boolean;
  inventory: BloodBankInventoryItem[];
  avgResponseTime: string;
}

interface BloodBankResultsProps {
  bloodGroup: BloodGroup | '';
  isLoading: boolean;
  showCompatible: boolean;
}

export default function BloodBankResults({ bloodGroup, isLoading }: BloodBankResultsProps) {
  const [expandedId, setExpandedId] = useState<string | null>('bb-001');

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
    ? MOCK_BLOOD_BANKS.filter((bb) =>
        bb.inventory.some(
          (inv) => inv.bloodGroup === bloodGroup && inv.status !== 'out_of_stock'
        )
      )
    : MOCK_BLOOD_BANKS;

  if (filtered.length === 0) {
    return (
      <EmptyState
        variant="search"
        title="No blood banks with available stock"
        description={`No verified blood banks have ${bloodGroup} in stock within the selected radius. Try expanding the search area or enabling compatible blood types.`}
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

  const handleContact = () => {
    toast.success(`Contacting ${bank.name}. Phone: ${bank.phone}`);
  };

  return (
    <div className={`bg-card border rounded-2xl overflow-hidden card-hover transition-all duration-200 ${
      targetInv?.status === 'critical' || targetInv?.status === 'out_of_stock' ?'border-red-200' :'border-border'
    }`}>
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
                  <CheckCircle size={14} className="text-success flex-shrink-0" title="Verified institution" />
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
                <span className="truncate">{bank.address}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            <span className="text-sm font-bold text-primary font-tabular">{bank.distanceKm} km</span>
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
            <span>Avg response: {bank.avgResponseTime}</span>
          </div>
          {targetInv && targetInv.units > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold text-foreground font-tabular">{targetInv.units}</span>
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
        <div className="flex items-center gap-2 mt-4">
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
          <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors ml-auto">
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
                  inv.status === 'available' ?'bg-success-bg border-green-200'
                    : inv.status === 'low' ?'bg-warning-bg border-amber-200'
                    : inv.status === 'critical' ?'bg-critical-bg border-red-200' :'bg-muted border-border'
                } ${inv.bloodGroup === targetBloodGroup ? 'ring-2 ring-primary ring-offset-1' : ''}`}
              >
                <p className={`text-base font-extrabold font-tabular ${
                  inv.status === 'out_of_stock' ? 'text-muted-foreground' : 'text-foreground'
                }`}>
                  {inv.bloodGroup}
                </p>
                <p className={`text-xl font-bold font-tabular mt-0.5 ${
                  inv.status === 'available' ?'text-success'
                    : inv.status === 'low' ?'text-warning'
                    : inv.status === 'critical' ?'text-critical' :'text-muted-foreground'
                }`}>
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
            Last updated: {bank.inventory[0]?.lastUpdated}. Verify availability by phone before visiting.
          </p>
        </div>
      )}
    </div>
  );
}

// Mock data — BACKEND INTEGRATION: replace with /api/search/blood-banks?...
const MOCK_BLOOD_BANKS: BloodBankResult[] = [
  {
    id: 'bb-001',
    name: 'Lilavati Hospital Blood Bank',
    type: 'Private Hospital Blood Bank',
    address: 'A-791, Bandra Reclamation, Bandra West, Mumbai',
    distanceKm: 1.8,
    phone: '022-2675-1000',
    operatingHours: '24 hours, 7 days',
    isVerified: true,
    isOpen: true,
    avgResponseTime: '12 min',
    inventory: [
      { bloodGroup: 'A+', units: 28, status: 'available', lastUpdated: '13 Sep 2026, 09:45 AM' },
      { bloodGroup: 'A-', units: 4, status: 'low', lastUpdated: '13 Sep 2026, 09:45 AM' },
      { bloodGroup: 'B+', units: 19, status: 'available', lastUpdated: '13 Sep 2026, 09:45 AM' },
      { bloodGroup: 'B-', units: 2, status: 'critical', lastUpdated: '13 Sep 2026, 09:45 AM' },
      { bloodGroup: 'AB+', units: 11, status: 'available', lastUpdated: '13 Sep 2026, 09:45 AM' },
      { bloodGroup: 'AB-', units: 0, status: 'out_of_stock', lastUpdated: '13 Sep 2026, 09:45 AM' },
      { bloodGroup: 'O+', units: 34, status: 'available', lastUpdated: '13 Sep 2026, 09:45 AM' },
      { bloodGroup: 'O-', units: 6, status: 'low', lastUpdated: '13 Sep 2026, 09:45 AM' },
    ],
  },
  {
    id: 'bb-002',
    name: 'Apollo Hospital — Andheri',
    type: 'Private Hospital Blood Bank',
    address: 'Plot No. 13, Sector 4, Andheri East, Mumbai',
    distanceKm: 2.4,
    phone: '022-6820-1000',
    operatingHours: '24 hours, 7 days',
    isVerified: true,
    isOpen: true,
    avgResponseTime: '8 min',
    inventory: [
      { bloodGroup: 'A+', units: 41, status: 'available', lastUpdated: '13 Sep 2026, 09:52 AM' },
      { bloodGroup: 'A-', units: 0, status: 'out_of_stock', lastUpdated: '13 Sep 2026, 09:52 AM' },
      { bloodGroup: 'B+', units: 31, status: 'available', lastUpdated: '13 Sep 2026, 09:52 AM' },
      { bloodGroup: 'B-', units: 1, status: 'critical', lastUpdated: '13 Sep 2026, 09:52 AM' },
      { bloodGroup: 'AB+', units: 8, status: 'available', lastUpdated: '13 Sep 2026, 09:52 AM' },
      { bloodGroup: 'AB-', units: 3, status: 'low', lastUpdated: '13 Sep 2026, 09:52 AM' },
      { bloodGroup: 'O+', units: 52, status: 'available', lastUpdated: '13 Sep 2026, 09:52 AM' },
      { bloodGroup: 'O-', units: 9, status: 'available', lastUpdated: '13 Sep 2026, 09:52 AM' },
    ],
  },
  {
    id: 'bb-003',
    name: 'Hinduja Hospital Blood Bank',
    type: 'Private Hospital Blood Bank',
    address: 'Veer Savarkar Marg, Mahim West, Mumbai',
    distanceKm: 3.1,
    phone: '022-2445-1515',
    operatingHours: '8 AM – 8 PM (Collection); 24hr (Emergency)',
    isVerified: true,
    isOpen: true,
    avgResponseTime: '15 min',
    inventory: [
      { bloodGroup: 'A+', units: 17, status: 'available', lastUpdated: '13 Sep 2026, 08:30 AM' },
      { bloodGroup: 'A-', units: 7, status: 'available', lastUpdated: '13 Sep 2026, 08:30 AM' },
      { bloodGroup: 'B+', units: 3, status: 'low', lastUpdated: '13 Sep 2026, 08:30 AM' },
      { bloodGroup: 'B-', units: 0, status: 'out_of_stock', lastUpdated: '13 Sep 2026, 08:30 AM' },
      { bloodGroup: 'AB+', units: 5, status: 'available', lastUpdated: '13 Sep 2026, 08:30 AM' },
      { bloodGroup: 'AB-', units: 1, status: 'critical', lastUpdated: '13 Sep 2026, 08:30 AM' },
      { bloodGroup: 'O+', units: 29, status: 'available', lastUpdated: '13 Sep 2026, 08:30 AM' },
      { bloodGroup: 'O-', units: 4, status: 'low', lastUpdated: '13 Sep 2026, 08:30 AM' },
    ],
  },
  {
    id: 'bb-004',
    name: 'Kokilaben Dhirubhai Ambani Hospital',
    type: 'Private Hospital Blood Bank',
    address: 'Rao Saheb Achutrao Patwardhan Marg, Four Bungalows, Andheri West',
    distanceKm: 4.7,
    phone: '022-3066-5000',
    operatingHours: '24 hours, 7 days',
    isVerified: true,
    isOpen: true,
    avgResponseTime: '10 min',
    inventory: [
      { bloodGroup: 'A+', units: 55, status: 'available', lastUpdated: '13 Sep 2026, 10:00 AM' },
      { bloodGroup: 'A-', units: 12, status: 'available', lastUpdated: '13 Sep 2026, 10:00 AM' },
      { bloodGroup: 'B+', units: 47, status: 'available', lastUpdated: '13 Sep 2026, 10:00 AM' },
      { bloodGroup: 'B-', units: 8, status: 'available', lastUpdated: '13 Sep 2026, 10:00 AM' },
      { bloodGroup: 'AB+', units: 22, status: 'available', lastUpdated: '13 Sep 2026, 10:00 AM' },
      { bloodGroup: 'AB-', units: 6, status: 'available', lastUpdated: '13 Sep 2026, 10:00 AM' },
      { bloodGroup: 'O+', units: 68, status: 'available', lastUpdated: '13 Sep 2026, 10:00 AM' },
      { bloodGroup: 'O-', units: 15, status: 'available', lastUpdated: '13 Sep 2026, 10:00 AM' },
    ],
  },
  {
    id: 'bb-005',
    name: 'KEM Hospital Blood Bank (Government)',
    type: 'Government Hospital Blood Bank',
    address: 'Acharya Donde Marg, Parel, Mumbai',
    distanceKm: 5.9,
    phone: '022-2410-7000',
    operatingHours: '24 hours, 7 days',
    isVerified: true,
    isOpen: true,
    avgResponseTime: '22 min',
    inventory: [
      { bloodGroup: 'A+', units: 62, status: 'available', lastUpdated: '13 Sep 2026, 07:15 AM' },
      { bloodGroup: 'A-', units: 2, status: 'critical', lastUpdated: '13 Sep 2026, 07:15 AM' },
      { bloodGroup: 'B+', units: 58, status: 'available', lastUpdated: '13 Sep 2026, 07:15 AM' },
      { bloodGroup: 'B-', units: 0, status: 'out_of_stock', lastUpdated: '13 Sep 2026, 07:15 AM' },
      { bloodGroup: 'AB+', units: 18, status: 'available', lastUpdated: '13 Sep 2026, 07:15 AM' },
      { bloodGroup: 'AB-', units: 0, status: 'out_of_stock', lastUpdated: '13 Sep 2026, 07:15 AM' },
      { bloodGroup: 'O+', units: 89, status: 'available', lastUpdated: '13 Sep 2026, 07:15 AM' },
      { bloodGroup: 'O-', units: 3, status: 'low', lastUpdated: '13 Sep 2026, 07:15 AM' },
    ],
  },
];