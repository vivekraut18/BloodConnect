'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import {
  MapPin, List, Map as MapIcon, Locate, LocateOff, RefreshCw,
  Clock, Loader2, AlertTriangle, Info, SlidersHorizontal, Search,
  Shield,
} from 'lucide-react';
import { useGeolocation } from '@/lib/hooks/useGeolocation';
import FacilityList, { NearbyFacility } from './FacilityList';
import { BLOOD_GROUPS, SEARCH_RADIUS_OPTIONS, BloodGroup } from '@/lib/constants';
import { toast } from 'sonner';

// Dynamically import the map to avoid SSR issues with Leaflet
const FacilityMap = dynamic(() => import('./FacilityMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] lg:h-[500px] bg-muted rounded-2xl border border-border flex items-center justify-center">
      <div className="flex flex-col items-center gap-2 text-muted-foreground">
        <Loader2 size={24} className="animate-spin" />
        <span className="text-sm">Loading map…</span>
      </div>
    </div>
  ),
});

type ViewMode = 'map' | 'list';
type FacilityTypeFilter = 'all' | 'hospital' | 'blood_bank';

export default function NearbyFacilitiesContent() {
  const geo = useGeolocation({ movementThreshold: 300 });

  const [viewMode, setViewMode] = useState<ViewMode>('map');
  const [facilities, setFacilities] = useState<NearbyFacility[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<string | null>(null);

  // Filters
  const [radiusKm, setRadiusKm] = useState(10);
  const [bloodGroup, setBloodGroup] = useState<BloodGroup | ''>('');
  const [facilityType, setFacilityType] = useState<FacilityTypeFilter>('all');

  // Manual location entry
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [manualCity, setManualCity] = useState('');

  // Fetch facilities from API
  const fetchFacilities = useCallback(async (lat: number, lng: number) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        lat: lat.toString(),
        lng: lng.toString(),
        radiusKm: radiusKm.toString(),
        type: facilityType,
      });
      if (bloodGroup) params.set('bloodGroup', bloodGroup);

      const response = await fetch(`/api/blood-banks/nearby?${params}`);
      const result = await response.json();

      if (result.success) {
        setFacilities(result.data.facilities);
        setLastFetchTime(new Date().toISOString());
      } else {
        toast.error(result.message || 'Failed to fetch facilities');
        setFacilities([]);
      }
    } catch (err) {
      toast.error('Network error. Please try again.');
      setFacilities([]);
    } finally {
      setIsLoading(false);
    }
  }, [radiusKm, bloodGroup, facilityType]);

  // Auto-fetch when location becomes available or filters change
  useEffect(() => {
    if (geo.latitude !== null && geo.longitude !== null) {
      fetchFacilities(geo.latitude, geo.longitude);
    }
  }, [geo.latitude, geo.longitude, fetchFacilities]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Simple city-to-coordinates lookup for common Indian cities
    const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
      'mumbai': { lat: 19.076, lng: 72.8777 },
      'delhi': { lat: 28.6139, lng: 77.209 },
      'bangalore': { lat: 12.9716, lng: 77.5946 },
      'bengaluru': { lat: 12.9716, lng: 77.5946 },
      'chennai': { lat: 13.0827, lng: 80.2707 },
      'kolkata': { lat: 22.5726, lng: 88.3639 },
      'hyderabad': { lat: 17.385, lng: 78.4867 },
      'pune': { lat: 18.5204, lng: 73.8567 },
      'ahmedabad': { lat: 23.0225, lng: 72.5714 },
      'jaipur': { lat: 26.9124, lng: 75.7873 },
    };

    if (manualLat && manualLng) {
      const lat = parseFloat(manualLat);
      const lng = parseFloat(manualLng);
      if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
        geo.setManualLocation(lat, lng);
        setShowManualEntry(false);
        toast.success('Location set manually');
        return;
      }
      toast.error('Invalid coordinates. Latitude must be -90 to 90, longitude -180 to 180.');
      return;
    }

    if (manualCity) {
      const cityKey = manualCity.trim().toLowerCase();
      const coords = CITY_COORDS[cityKey];
      if (coords) {
        geo.setManualLocation(coords.lat, coords.lng);
        setShowManualEntry(false);
        toast.success(`Location set to ${manualCity}`);
        return;
      }
      toast.error('City not found. Please enter coordinates directly, or try: Mumbai, Delhi, Bangalore, Chennai, Kolkata, Hyderabad, Pune.');
      return;
    }

    toast.error('Please enter a city name or coordinates.');
  };

  const handleRefresh = () => {
    if (geo.latitude !== null && geo.longitude !== null) {
      fetchFacilities(geo.latitude, geo.longitude);
    }
  };

  const formatTime = (iso: string | null) => {
    if (!iso) return 'Never';
    return new Date(iso).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const facilityCount = useMemo(() => ({
    total: facilities.length,
    hospitals: facilities.filter((f) => f.type === 'Hospital').length,
    bloodBanks: facilities.filter((f) => f.type !== 'Hospital').length,
  }), [facilities]);

  // Determine what to show based on geo state
  const hasLocation = geo.latitude !== null && geo.longitude !== null;

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Nearby Hospitals & Blood Banks</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Find verified blood banks and hospitals near your current location
          </p>
        </div>
        {lastFetchTime && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-card border border-border rounded-lg px-3 py-2">
            <Clock size={13} />
            <span>Updated: {formatTime(lastFetchTime)}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-success" />
          </div>
        )}
      </div>

      {/* Location permission & controls */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${hasLocation ? 'bg-success-bg' : geo.status === 'denied' ? 'bg-error-bg' : 'bg-primary-light'
              }`}>
              {hasLocation ? (
                <MapPin size={18} className="text-success" />
              ) : geo.status === 'requesting' ? (
                <Loader2 size={18} className="animate-spin text-primary" />
              ) : (
                <MapPin size={18} className={geo.status === 'denied' ? 'text-error' : 'text-primary'} />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {geo.status === 'idle' && 'Enable location to find nearby facilities'}
                {geo.status === 'requesting' && 'Requesting location permission…'}
                {geo.status === 'granted' && `Location active — ${geo.latitude?.toFixed(4)}°N, ${geo.longitude?.toFixed(4)}°E`}
                {geo.status === 'denied' && 'Location permission denied'}
                {geo.status === 'unavailable' && 'Location unavailable'}
                {geo.status === 'error' && 'Location error'}
              </p>
              <p className="text-xs text-muted-foreground">
                {geo.status === 'idle' && 'Your location is never stored on our servers.'}
                {geo.status === 'requesting' && 'Please allow location access in your browser.'}
                {geo.status === 'granted' && (geo.isWatching
                  ? 'Auto-updating. Location updates stop when the browser is closed.'
                  : `Last updated: ${formatTime(geo.lastUpdated)}`
                )}
                {(geo.status === 'denied' || geo.status === 'unavailable' || geo.status === 'error') &&
                  (geo.error || 'You can enter your location manually below.')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {!hasLocation && geo.status !== 'requesting' && (
              <button
                onClick={() => geo.startWatching()}
                className="btn-primary flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold"
              >
                <Locate size={15} />
                Enable Location
              </button>
            )}
            {geo.isWatching && (
              <button
                onClick={() => geo.stopWatching()}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground border border-border hover:bg-muted transition-colors"
              >
                <LocateOff size={15} />
                Stop Sharing
              </button>
            )}
            {hasLocation && !geo.isWatching && (
              <button
                onClick={() => geo.startWatching()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-primary hover:bg-primary-light transition-colors"
              >
                <Locate size={13} />
                Resume
              </button>
            )}
            <button
              onClick={() => setShowManualEntry((p) => !p)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border border-border"
            >
              <Search size={13} />
              Enter Manually
            </button>
          </div>
        </div>

        {/* Manual location entry */}
        {showManualEntry && (
          <form onSubmit={handleManualSubmit} className="mt-4 pt-4 border-t border-border fade-in">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Enter Location Manually
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1">City</label>
                <input
                  type="text"
                  value={manualCity}
                  onChange={(e) => setManualCity(e.target.value)}
                  placeholder="e.g. Mumbai, Delhi, Bangalore"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Latitude</label>
                <input
                  type="text"
                  value={manualLat}
                  onChange={(e) => setManualLat(e.target.value)}
                  placeholder="e.g. 19.076"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Longitude</label>
                <input
                  type="text"
                  value={manualLng}
                  onChange={(e) => setManualLng(e.target.value)}
                  placeholder="e.g. 72.877"
                  className="input-field"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Enter a city name or exact coordinates. City search covers major Indian cities.
            </p>
            <div className="flex gap-2 mt-3">
              <button type="submit" className="btn-primary px-4 py-2 rounded-lg text-xs font-semibold">
                Set Location
              </button>
              <button
                type="button"
                onClick={() => setShowManualEntry(false)}
                className="px-3 py-2 rounded-lg text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Privacy notice */}
        <div className="flex items-start gap-2 mt-3 pt-3 border-t border-border">
          <Shield size={12} className="text-muted-foreground flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Your location is processed in your browser and used only to find nearby facilities. It is <strong>not stored</strong> on our servers.
            Location tracking is active only while this page is open and stops when you close the browser or navigate away.
          </p>
        </div>
      </div>

      {/* Only show filters + results when we have a location */}
      {hasLocation && (
        <>
          {/* Filters bar */}
          <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={14} className="text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">Filters</span>
              </div>
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-primary hover:bg-primary-light transition-colors disabled:opacity-50"
              >
                <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-4">
              {/* Blood group chips */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
                  Blood Group
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setBloodGroup('')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-bold border-2 transition-all duration-150 ${bloodGroup === ''
                      ? 'bg-primary text-white border-primary shadow-sm'
                      : 'bg-card text-muted-foreground border-border hover:border-primary/50'
                      }`}
                  >
                    All
                  </button>
                  {BLOOD_GROUPS.map((bg) => (
                    <button
                      key={`nearby-bg-${bg}`}
                      onClick={() => setBloodGroup(bloodGroup === bg ? '' : bg)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-bold border-2 transition-all duration-150 ${bloodGroup === bg
                        ? 'bg-emergency text-white border-emergency shadow-sm'
                        : 'bg-card text-muted-foreground border-border hover:border-emergency/50 hover:text-emergency'
                        }`}
                    >
                      {bg}
                    </button>
                  ))}
                </div>
              </div>

              {/* Facility type */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
                  Type
                </label>
                <select
                  value={facilityType}
                  onChange={(e) => setFacilityType(e.target.value as FacilityTypeFilter)}
                  className="input-field"
                >
                  <option value="all">All Facilities</option>
                  <option value="hospital">Hospitals</option>
                  <option value="blood_bank">Blood Banks</option>
                </select>
              </div>

              {/* Radius */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
                  Radius
                </label>
                <select
                  value={radiusKm}
                  onChange={(e) => setRadiusKm(Number(e.target.value))}
                  className="input-field"
                >
                  {SEARCH_RADIUS_OPTIONS.map((r) => (
                    <option key={`nearby-radius-${r}`} value={r}>{r} km</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Result summary + view toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-foreground">
                {facilityCount.total} facilit{facilityCount.total === 1 ? 'y' : 'ies'} found
              </span>
              <span className="text-xs text-muted-foreground">
                within {radiusKm} km
              </span>
              {bloodGroup && (
                <span className="text-xs font-bold text-emergency bg-emergency-bg border border-red-200 rounded-full px-2 py-0.5">
                  {bloodGroup}
                </span>
              )}
              {facilityCount.hospitals > 0 && (
                <span className="text-xs text-muted-foreground">
                  · {facilityCount.hospitals} hospital{facilityCount.hospitals !== 1 ? 's' : ''}
                </span>
              )}
              {facilityCount.bloodBanks > 0 && (
                <span className="text-xs text-muted-foreground">
                  · {facilityCount.bloodBanks} blood bank{facilityCount.bloodBanks !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* View toggle */}
            <div className="flex rounded-xl border border-border bg-muted p-1">
              <button
                onClick={() => setViewMode('map')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${viewMode === 'map'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                <MapIcon size={14} />
                Map
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${viewMode === 'list'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                <List size={14} />
                List
              </button>
            </div>
          </div>

          {/* Map view */}
          {viewMode === 'map' && (
            <div className="space-y-4 fade-in">
              <FacilityMap
                facilities={facilities}
                userLat={geo.latitude}
                userLng={geo.longitude}
                radiusKm={radiusKm}
                selectedFacilityId={selectedFacilityId}
                onFacilitySelect={setSelectedFacilityId}
              />
              {/* Selected facility detail below map */}
              {selectedFacilityId && (
                <FacilityList
                  facilities={facilities.filter((f) => f.id === selectedFacilityId)}
                  isLoading={false}
                  selectedFacilityId={selectedFacilityId}
                  onFacilitySelect={setSelectedFacilityId}
                  bloodGroup={bloodGroup}
                />
              )}
              {/* Compact list of all facilities */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  All Facilities ({facilities.length})
                </p>
                <FacilityList
                  facilities={facilities}
                  isLoading={isLoading}
                  selectedFacilityId={selectedFacilityId}
                  onFacilitySelect={setSelectedFacilityId}
                  bloodGroup={bloodGroup}
                />
              </div>
            </div>
          )}

          {/* List view */}
          {viewMode === 'list' && (
            <div className="fade-in">
              <FacilityList
                facilities={facilities}
                isLoading={isLoading}
                selectedFacilityId={selectedFacilityId}
                onFacilitySelect={setSelectedFacilityId}
                bloodGroup={bloodGroup}
              />
            </div>
          )}

          {/* Medical disclaimer */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-warning-bg border border-amber-200">
            <AlertTriangle size={16} className="text-warning flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-warning mb-0.5">Medical Notice</p>
              <p className="text-xs text-amber-700 leading-relaxed">
                Results show facility locations and reported inventory only. Blood compatibility and donor eligibility must be confirmed by qualified hospital or blood bank staff before any transfusion. Always call ahead to verify availability. In a medical emergency, call <strong>112</strong> immediately.
              </p>
            </div>
          </div>
        </>
      )}

      {/* No location state */}
      {!hasLocation && geo.status !== 'requesting' && (
        <div className="bg-card border border-border rounded-2xl p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary-light flex items-center justify-center mx-auto mb-4">
            <MapPin size={28} className="text-primary" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-1.5">
            Enable location to see nearby facilities
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed mb-5">
            Allow location access to discover hospitals and blood banks near you,
            or enter your location manually using the button above.
          </p>
          <button
            onClick={() => geo.startWatching()}
            className="btn-primary px-6 py-3 rounded-xl text-sm font-semibold"
          >
            <Locate size={15} className="inline mr-2" />
            Enable Location
          </button>
        </div>
      )}

      {/* Requesting state */}
      {geo.status === 'requesting' && !hasLocation && (
        <div className="bg-card border border-border rounded-2xl p-12 text-center fade-in">
          <Loader2 size={32} className="animate-spin text-primary mx-auto mb-4" />
          <h3 className="text-base font-semibold text-foreground mb-1.5">
            Requesting location access…
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Please allow location access in your browser&apos;s permission dialog.
          </p>
        </div>
      )}
    </div>
  );
}
