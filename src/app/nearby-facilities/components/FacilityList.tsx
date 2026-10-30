'use client';
import React, { useState } from 'react';
import {
  MapPin, Phone, Clock, ChevronDown, ChevronUp, ExternalLink,
  CheckCircle, AlertTriangle, Navigation, Info,
} from 'lucide-react';
import { InventoryStatusBadge } from '@/components/ui/Badge';
import { SearchResultCardSkeleton } from '@/components/ui/LoadingSkeleton';
import EmptyState from '@/components/ui/EmptyState';
import { BloodGroup } from '@/lib/constants';

interface InventoryItem {
  bloodGroup: string;
  units: number;
  status: string;
  lastUpdated: string | null;
}

export interface NearbyFacility {
  id: string;
  name: string;
  type: string;
  address: string;
  city: string;
  contact: string;
  phone: string;
  operatingHours: string;
  isVerified: boolean;
  isOpen: boolean;
  latitude: number;
  longitude: number;
  distanceKm: number;
  inventory: InventoryItem[];
  stock: Record<string, { units: number; status: string }>;
  hasInventoryData: boolean;
  inventoryLastUpdated: string | null;
  updatedAt: string;
}

interface FacilityListProps {
  facilities: NearbyFacility[];
  isLoading: boolean;
  selectedFacilityId: string | null;
  onFacilitySelect: (id: string) => void;
  bloodGroup: BloodGroup | '';
}

export default function FacilityList({
  facilities,
  isLoading,
  selectedFacilityId,
  onFacilitySelect,
  bloodGroup,
}: FacilityListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }, (_, i) => (
          <SearchResultCardSkeleton key={`nearby-skel-${i}`} />
        ))}
      </div>
    );
  }

  if (facilities.length === 0) {
    return (
      <EmptyState
        variant="search"
        title="No facilities found nearby"
        description="No hospitals or blood banks with coordinates found within the selected radius. Try increasing the search radius or changing your location."
      />
    );
  }

  return (
    <div className="space-y-3">
      {facilities.map((facility) => (
        <FacilityCard
          key={`nearby-${facility.id}`}
          facility={facility}
          isSelected={selectedFacilityId === facility.id}
          onSelect={() => onFacilitySelect(facility.id)}
          targetBloodGroup={bloodGroup}
        />
      ))}
    </div>
  );
}

function FacilityCard({
  facility,
  isSelected,
  onSelect,
  targetBloodGroup,
}: {
  facility: NearbyFacility;
  isSelected: boolean;
  onSelect: () => void;
  targetBloodGroup: BloodGroup | '';
}) {
  const [expanded, setExpanded] = useState(false);

  const targetInv = targetBloodGroup
    ? facility.inventory.find((i) => i.bloodGroup === targetBloodGroup)
    : null;

  const handleDirections = () => {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${facility.latitude},${facility.longitude}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const handleCall = () => {
    window.open(`tel:${facility.phone}`, '_self');
  };

  const formatTimestamp = (iso: string | null) => {
    if (!iso) return 'Unknown';
    try {
      return new Date(iso).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div
      className={`bg-card border rounded-2xl overflow-hidden transition-all duration-200 cursor-pointer ${
        isSelected
          ? 'border-primary ring-2 ring-primary/20 shadow-md'
          : targetInv?.status === 'critical' || targetInv?.status === 'out_of_stock'
            ? 'border-red-200 hover:shadow-sm'
            : 'border-border hover:shadow-sm hover:border-border/80'
      }`}
      onClick={onSelect}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-primary-light flex items-center justify-center flex-shrink-0">
              <span className="text-lg">🏥</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-foreground">{facility.name}</h3>
                {facility.isVerified && (
                  <CheckCircle size={14} className="text-success flex-shrink-0" />
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{facility.type}</p>
              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                <MapPin size={11} />
                <span className="truncate">{facility.address}, {facility.city}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            <span className="text-sm font-bold text-primary font-tabular">
              {facility.distanceKm} km
            </span>
            {targetInv && (
              <InventoryStatusBadge status={targetInv.status as any} />
            )}
          </div>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-4 mt-3 flex-wrap">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock size={11} />
            <span>{facility.operatingHours}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Phone size={11} />
            <span>{facility.phone}</span>
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

        {/* Critical warning */}
        {targetInv?.status === 'critical' && (
          <div className="flex items-center gap-2 mt-3 p-2.5 rounded-lg bg-critical-bg border border-red-200">
            <AlertTriangle size={13} className="text-critical flex-shrink-0" />
            <p className="text-xs text-critical font-semibold">
              Only {targetInv.units} unit{targetInv.units !== 1 ? 's' : ''} remaining — contact immediately
            </p>
          </div>
        )}

        {/* Unverified inventory warning */}
        {!facility.hasInventoryData && (
          <div className="flex items-center gap-2 mt-3 p-2 rounded-lg bg-muted border border-border">
            <Info size={12} className="text-muted-foreground flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              Inventory data not available. Contact the facility directly to check availability.
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2 mt-4" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={handleCall}
            className="btn-primary flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold"
          >
            <Phone size={13} />
            Call Now
          </button>
          <button
            onClick={() => setExpanded((p) => !p)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border border-border"
          >
            {expanded ? (
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
            onClick={handleDirections}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors ml-auto"
          >
            <Navigation size={12} />
            Directions
          </button>
        </div>
      </div>

      {/* Expanded inventory panel */}
      {expanded && facility.hasInventoryData && (
        <div
          className="border-t border-border bg-muted/30 px-5 py-4 fade-in"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Blood Inventory
            </p>
            {facility.inventoryLastUpdated && (
              <div className="flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-success" />
                <span className="text-xs text-muted-foreground">
                  Updated: {formatTimestamp(facility.inventoryLastUpdated)}
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {facility.inventory.map((inv) => (
              <div
                key={`inv-nearby-${facility.id}-${inv.bloodGroup}`}
                className={`rounded-xl border p-3 text-center ${
                  inv.status === 'available' ? 'bg-success-bg border-green-200'
                    : inv.status === 'low' ? 'bg-warning-bg border-amber-200'
                    : inv.status === 'critical' ? 'bg-critical-bg border-red-200'
                    : 'bg-muted border-border'
                } ${inv.bloodGroup === targetBloodGroup ? 'ring-2 ring-primary ring-offset-1' : ''}`}
              >
                <p className={`text-base font-extrabold font-tabular ${
                  inv.status === 'out_of_stock' ? 'text-muted-foreground' : 'text-foreground'
                }`}>
                  {inv.bloodGroup}
                </p>
                <p className={`text-xl font-bold font-tabular mt-0.5 ${
                  inv.status === 'available' ? 'text-success'
                    : inv.status === 'low' ? 'text-warning'
                    : inv.status === 'critical' ? 'text-critical'
                    : 'text-muted-foreground'
                }`}>
                  {inv.units}
                </p>
                <p className="text-xs text-muted-foreground">units</p>
                <div className="mt-1.5">
                  <InventoryStatusBadge status={inv.status as any} />
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground mt-3">
            Verify availability by phone before visiting. Inventory data is provided by the facility and may not reflect real-time stock.
          </p>
        </div>
      )}
    </div>
  );
}
