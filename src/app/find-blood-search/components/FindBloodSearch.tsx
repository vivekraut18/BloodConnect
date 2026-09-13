'use client';
import React, { useState, useCallback } from 'react';
import SearchFiltersBar from './SearchFiltersBar';
import BloodBankResults from './BloodBankResults';
import DonorResults from './DonorResults';
import EmergencyRequestFAB from './EmergencyRequest';
import { AlertTriangle, Clock, Info, Building2, Users } from 'lucide-react';
import { BloodGroup } from '@/lib/constants';

export type SearchState = {
  bloodGroup: BloodGroup | '';
  location: string;
  radiusKm: number;
  isEmergency: boolean;
  showCompatible: boolean;
};

const RESULT_TABS = [
  { value: 'bloodbanks' as const, label: 'Blood Banks & Hospitals', Icon: Building2, count: 8 },
  { value: 'donors' as const, label: 'Matched Donors', Icon: Users, count: 14 },
];

export default function FindBloodSearchContent() {
  const [activeTab, setActiveTab] = useState<'bloodbanks' | 'donors'>('bloodbanks');
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(true);
  const [lastUpdated] = useState('13 Sep 2026, 10:03 AM');

  const [searchState, setSearchState] = useState<SearchState>({
    bloodGroup: 'B+',
    location: 'Andheri West, Mumbai',
    radiusKm: 10,
    isEmergency: false,
    showCompatible: false,
  });

  const handleSearch = useCallback(async (newState: SearchState) => {
    setSearchState(newState);
    setIsSearching(true);
    // BACKEND INTEGRATION: GET /api/search/blood?bloodGroup=B+&lat=19.1234&lng=72.8456&radius=10&emergency=false
    await new Promise((r) => setTimeout(r, 900));
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
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-card border border-border rounded-lg px-3 py-2">
          <Clock size={13} />
          <span>Data as of {lastUpdated}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-success" />
          <span className="text-success font-medium">Live</span>
        </div>
      </div>

      {/* Medical disclaimer banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-warning-bg border border-amber-200">
        <AlertTriangle size={16} className="text-warning flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-warning mb-0.5">Medical Notice</p>
          <p className="text-xs text-amber-700 leading-relaxed">
            Results show resource availability only. Blood compatibility and donor eligibility must be confirmed by qualified hospital or blood bank staff before any transfusion. In a medical emergency, call <strong>112</strong> immediately.
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
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground">
              Results for{' '}
              <span className="text-emergency font-bold">{searchState.bloodGroup || 'All Groups'}</span>
              {searchState.showCompatible && (
                <span className="text-muted-foreground font-normal"> + compatible types</span>
              )}
              {' '}near{' '}
              <span className="text-primary">{searchState.location}</span>
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
                <span
                  className={`text-xs rounded-full px-2 py-0.5 font-bold ${
                    activeTab === tab.value
                      ? 'bg-primary text-white' :'bg-border text-muted-foreground'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="fade-in">
            {activeTab === 'bloodbanks' ? (
              <BloodBankResults
                bloodGroup={searchState.bloodGroup}
                isLoading={isSearching}
                showCompatible={searchState.showCompatible}
              />
            ) : (
              <DonorResults
                bloodGroup={searchState.bloodGroup}
                isLoading={isSearching}
                showCompatible={searchState.showCompatible}
              />
            )}
          </div>

          {/* Compatibility note */}
          {searchState.showCompatible && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-primary-light border border-blue-200">
              <Info size={14} className="text-primary flex-shrink-0 mt-0.5" />
              <p className="text-xs text-primary leading-relaxed">
                Showing compatible blood groups based on standard ABO/Rh compatibility. Final compatibility must be verified by hospital staff through cross-matching.
              </p>
            </div>
          )}
        </div>
      )}

      {/* FAB */}
      <EmergencyRequestFAB bloodGroup={searchState.bloodGroup} location={searchState.location} />
    </div>
  );
}