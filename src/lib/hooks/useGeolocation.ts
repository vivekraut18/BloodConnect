'use client';
import { useState, useEffect, useCallback, useRef } from 'react';

export interface GeolocationState {
  /** Current latitude, null until first fix */
  latitude: number | null;
  /** Current longitude, null until first fix */
  longitude: number | null;
  /** Human-readable status */
  status: 'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable' | 'error';
  /** Error message if any */
  error: string | null;
  /** ISO timestamp of last successful position update */
  lastUpdated: string | null;
  /** Whether the hook is actively watching */
  isWatching: boolean;
}

interface UseGeolocationOptions {
  /** Minimum distance change in meters to trigger an update (default: 200) */
  movementThreshold?: number;
  /** Maximum age of a cached position in ms (default: 60000 = 1min) */
  maximumAge?: number;
  /** Timeout for each position request in ms (default: 15000) */
  timeout?: number;
  /** High accuracy mode — uses GPS if available (default: true) */
  enableHighAccuracy?: boolean;
}

const DEFAULT_OPTIONS: Required<UseGeolocationOptions> = {
  movementThreshold: 200,
  maximumAge: 60_000,
  timeout: 15_000,
  enableHighAccuracy: true,
};

/**
 * Calculate distance between two coordinates using the Haversine formula.
 * Returns distance in meters.
 */
function haversineMeters(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6_371_000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function useGeolocation(options?: UseGeolocationOptions) {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    status: 'idle',
    error: null,
    lastUpdated: null,
    isWatching: false,
  });

  const watchIdRef = useRef<number | null>(null);
  const lastCoordsRef = useRef<{ lat: number; lng: number } | null>(null);

  /** Stop watching */
  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setState((prev) => ({ ...prev, isWatching: false }));
  }, []);

  /** Start watching the user's location */
  const startWatching = useCallback(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        status: 'unavailable',
        error: 'Geolocation is not supported by your browser.',
      }));
      return;
    }

    setState((prev) => ({ ...prev, status: 'requesting', error: null }));

    const onSuccess = (position: GeolocationPosition) => {
      const { latitude, longitude } = position.coords;
      const prev = lastCoordsRef.current;

      // Only update if moved beyond threshold or first fix
      if (
        !prev ||
        haversineMeters(prev.lat, prev.lng, latitude, longitude) >= opts.movementThreshold
      ) {
        lastCoordsRef.current = { lat: latitude, lng: longitude };
        setState({
          latitude,
          longitude,
          status: 'granted',
          error: null,
          lastUpdated: new Date().toISOString(),
          isWatching: true,
        });
      }
    };

    const onError = (err: GeolocationPositionError) => {
      let status: GeolocationState['status'] = 'error';
      let errorMsg = err.message;

      if (err.code === err.PERMISSION_DENIED) {
        status = 'denied';
        errorMsg = 'Location permission was denied. You can enter your location manually.';
      } else if (err.code === err.POSITION_UNAVAILABLE) {
        status = 'unavailable';
        errorMsg = 'Location information is unavailable.';
      } else if (err.code === err.TIMEOUT) {
        errorMsg = 'Location request timed out. Please try again.';
      }

      setState((prev) => ({
        ...prev,
        status,
        error: errorMsg,
        isWatching: false,
      }));
    };

    // Clear any existing watch
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = navigator.geolocation.watchPosition(onSuccess, onError, {
      enableHighAccuracy: opts.enableHighAccuracy,
      maximumAge: opts.maximumAge,
      timeout: opts.timeout,
    });

    setState((prev) => ({ ...prev, isWatching: true }));
  }, [opts.enableHighAccuracy, opts.maximumAge, opts.movementThreshold, opts.timeout]);

  /** Request a one-time position fix */
  const requestOnce = useCallback(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        status: 'unavailable',
        error: 'Geolocation is not supported by your browser.',
      }));
      return;
    }

    setState((prev) => ({ ...prev, status: 'requesting', error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        lastCoordsRef.current = { lat: latitude, lng: longitude };
        setState({
          latitude,
          longitude,
          status: 'granted',
          error: null,
          lastUpdated: new Date().toISOString(),
          isWatching: false,
        });
      },
      (err) => {
        let status: GeolocationState['status'] = 'error';
        if (err.code === err.PERMISSION_DENIED) status = 'denied';
        else if (err.code === err.POSITION_UNAVAILABLE) status = 'unavailable';

        setState((prev) => ({
          ...prev,
          status,
          error: err.message,
          isWatching: false,
        }));
      },
      {
        enableHighAccuracy: opts.enableHighAccuracy,
        maximumAge: opts.maximumAge,
        timeout: opts.timeout,
      }
    );
  }, [opts.enableHighAccuracy, opts.maximumAge, opts.timeout]);

  /** Set location manually (bypass geolocation) */
  const setManualLocation = useCallback((lat: number, lng: number) => {
    lastCoordsRef.current = { lat, lng };
    setState({
      latitude: lat,
      longitude: lng,
      status: 'granted',
      error: null,
      lastUpdated: new Date().toISOString(),
      isWatching: false,
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return {
    ...state,
    startWatching,
    stopWatching,
    requestOnce,
    setManualLocation,
  };
}
