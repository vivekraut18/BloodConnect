'use client';
import React, { useState } from 'react';
import { Search, MapPin, Locate, SlidersHorizontal, Zap, Loader2, RefreshCw } from 'lucide-react';
import { BLOOD_GROUPS, SEARCH_RADIUS_OPTIONS } from '@/lib/constants';
import { SearchState } from './FindBloodSearch';

interface SearchFiltersBarProps {
  initialState: SearchState;
  onSearch: (state: SearchState) => void;
  isSearching: boolean;
}

export default function SearchFiltersBar({ initialState, onSearch, isSearching }: SearchFiltersBarProps) {
  const [local, setLocal] = useState<SearchState>(initialState);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const update = (patch: Partial<SearchState>) => setLocal((p) => ({ ...p, ...patch }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(local);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-4"
    >
      {/* Main search row */}
      <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr_auto] gap-3">
        {/* Blood group selector */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Blood Group
          </label>
          <div className="flex flex-wrap gap-1.5">
            {BLOOD_GROUPS.map((bg) => (
              <button
                key={`bg-chip-${bg}`}
                type="button"
                onClick={() => update({ bloodGroup: local.bloodGroup === bg ? '' : bg })}
                className={`px-3 py-1.5 rounded-lg text-sm font-bold border-2 transition-all duration-150 ${
                  local.bloodGroup === bg
                    ? 'bg-emergency text-white border-emergency shadow-sm'
                    : 'bg-card text-muted-foreground border-border hover:border-emergency/50 hover:text-emergency'
                }`}
              >
                {bg}
              </button>
            ))}
          </div>
        </div>

        {/* Location */}
        <div className="flex flex-col gap-1">
          <label htmlFor="search-location" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Location
          </label>
          <div className="relative">
            <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              id="search-location"
              type="text"
              value={local.location}
              onChange={(e) => update({ location: e.target.value })}
              placeholder="Area, city, or PIN code"
              className="input-field pl-9 pr-10"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
              title="Use my current location"
              aria-label="Use current location"
            >
              <Locate size={15} />
            </button>
          </div>
        </div>

        {/* Radius */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Radius
          </label>
          <select
            value={local.radiusKm}
            onChange={(e) => update({ radiusKm: Number(e.target.value) })}
            className="input-field w-24"
          >
            {SEARCH_RADIUS_OPTIONS.map((r) => (
              <option key={`radius-${r}`} value={r}>{r} km</option>
            ))}
          </select>
        </div>
      </div>

      {/* Advanced filters toggle */}
      <div>
        <button
          type="button"
          onClick={() => setShowAdvanced((p) => !p)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
        >
          <SlidersHorizontal size={13} />
          {showAdvanced ? 'Hide' : 'Show'} advanced filters
        </button>

        {showAdvanced && (
          <div className="mt-3 pt-3 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-4 fade-in">
            {/* Emergency toggle */}
            <label className="flex items-start gap-3 cursor-pointer">
              <div
                onClick={() => update({ isEmergency: !local.isEmergency })}
                className={`relative w-10 h-5 rounded-full transition-colors duration-200 flex-shrink-0 mt-0.5 cursor-pointer ${
                  local.isEmergency ? 'bg-emergency' : 'bg-border'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
                    local.isEmergency ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground flex items-center gap-1">
                  <Zap size={13} className="text-emergency" />
                  Emergency Mode
                </p>
                <p className="text-xs text-muted-foreground">
                  Prioritizes results by urgency. Notifies matched donors immediately.
                </p>
              </div>
            </label>

            {/* Show compatible */}
            <label className="flex items-start gap-3 cursor-pointer">
              <div
                onClick={() => update({ showCompatible: !local.showCompatible })}
                className={`relative w-10 h-5 rounded-full transition-colors duration-200 flex-shrink-0 mt-0.5 cursor-pointer ${
                  local.showCompatible ? 'bg-primary' : 'bg-border'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
                    local.showCompatible ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Show Compatible Types</p>
                <p className="text-xs text-muted-foreground">
                  Include compatible blood groups (e.g. O- for any request). Verify with hospital.
                </p>
              </div>
            </label>
          </div>
        )}
      </div>

      {/* Action row */}
      <div className="flex items-center gap-3 pt-1 border-t border-border">
        <button
          type="submit"
          disabled={isSearching || !local.bloodGroup}
          className="btn-primary flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSearching ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              Searching…
            </>
          ) : (
            <>
              <Search size={15} />
              Search Blood
            </>
          )}
        </button>
        <button
          type="button"
          onClick={() => {
            const reset: SearchState = {
              bloodGroup: '',
              location: '',
              radiusKm: 10,
              isEmergency: false,
              showCompatible: false,
            };
            setLocal(reset);
          }}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors font-medium"
        >
          <RefreshCw size={13} />
          Reset
        </button>
        {!local.bloodGroup && (
          <p className="text-xs text-muted-foreground">Select a blood group to search</p>
        )}
      </div>
    </form>
  );
}