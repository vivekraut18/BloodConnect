'use client';
import React, { useState, useCallback } from 'react';
import SearchFiltersBar from './SearchFiltersBar';
import BloodBankResults from './BloodBankResults';
import DonorResults from './DonorResults';
import EmergencyRequestFAB from './EmergencyRequest';
import CreateBloodRequest from '@/components/CreateBloodRequest';
import { AlertTriangle, Clock, Building2, Users } from 'lucide-react';
import { BloodGroup } from '@/lib/constants';

export type SearchState = {
  bloodGroup: BloodGroup | '';
  location: string;
  radiusKm: number;
  isEmergency: boolean;
  showCompatible: boolean;
};

const RESULT_TABS = [
  { value: 'bloodbanks' as const, label: 'Blood Banks & Hospitals', Icon: Building2 },
  { value: 'donors' as const, label: 'Matched Donors', Icon: Users },
];

export default function FindBloodSearchContent() {
  const [activeTab, setActiveTab] = useState<'bloodbanks' | 'donors'>('bloodbanks');
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(true);

  const [searchState, setSearchState] = useState<SearchState>({
    bloodGroup: '',
    location: '',
    radiusKm: 10,
    isEmergency: false,
    showCompatible: false,
  });

  const handleSearch = useCallback(async (newState: SearchState) => {
    setSearchState(newState);
    setIsSearching(true);
    await new Promise((r) => setTimeout(r, 400));
    setIsSearching(false);
    setHasSearched(true);
  }, []);

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Find Blood</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Search verified blood banks and matched donors near you
          </p>
        </div>
        <div className="flex items-center gap-3">
          <CreateBloodRequest />
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-card border border-border rounded-lg px-3 py-2">
            <Clock size={13} />
            <span>Real-time Supabase Inventory</span>
            <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />
            <span className="text-success font-medium">Live</span>
          </div>
        </div>
      </div>

      {/* Medical disclaimer banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-warning-bg border border-amber-200">
        <AlertTriangle size={16} className="text-warning flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-warning mb-0.5">Medical Notice</p>
          <p className="text-xs text-amber-700 leading-relaxed">
            Results show resource availability from verified hospital blood banks. Blood compatibility and donor eligibility must be confirmed by qualified medical staff before any transfusion. In a medical emergency, call <strong>112</strong> immediately.
          </p>
        </div>
      </div>

      {/* Search filters */}
      <SearchFiltersBar
        initialState={searchState}
        onSearch={handleSearch}
        isSearching={isSearching}
      />

      {/* Results */}
      {hasSearched && (
        <div className="space-y-4">
          {/* Results summary */}
          <div className="flex items-center gap-2 flex-wrap text-sm">
            <span className="font-semibold text-foreground">
              Results for{' '}
              <span className="text-emergency font-bold">{searchState.bloodGroup || 'All Blood Groups'}</span>
              {searchState.showCompatible && (
                <span className="text-muted-foreground font-normal"> + compatible types</span>
              )}
              {searchState.location && (
                <> near <span className="text-primary">{searchState.location}</span></>
              )}
            </span>
            <span className="text-xs text-muted-foreground">
              within {searchState.radiusKm} km
            </span>
            {searchState.isEmergency && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emergency bg-emergency-bg border border-red-200 rounded-full px-2.5 py-0.5">
                ⚡ Emergency Mode
              </span>
            )}
          </div>

          {/* Tabs */}
          <div className="flex rounded-xl border border-border bg-muted p-1 w-full sm:w-auto">
            {RESULT_TABS.map((tab) => (
              <button
                key={`result-tab-${tab.value}`}
                onClick={() => setActiveTab(tab.value)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  activeTab === tab.value
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <tab.Icon size={15} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="fade-in">
            {activeTab === 'bloodbanks' ? (
              <BloodBankResults
                bloodGroup={searchState.bloodGroup}
                location={searchState.location}
                isLoading={isSearching}
                showCompatible={searchState.showCompatible}
              />
            ) : (
              <DonorResults
                bloodGroup={searchState.bloodGroup}
                location={searchState.location}
                isLoading={isSearching}
                showCompatible={searchState.showCompatible}
              />
            )}
          </div>
        </div>
      )}

      {/* FAB */}
      <EmergencyRequestFAB bloodGroup={searchState.bloodGroup} location={searchState.location} />
    </div>
  );
}