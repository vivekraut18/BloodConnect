'use client';
import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Facility {
  id: string;
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
  address: string;
  phone: string;
  isVerified: boolean;
}

interface FacilityMapProps {
  facilities: Facility[];
  userLat: number | null;
  userLng: number | null;
  radiusKm: number;
  selectedFacilityId: string | null;
  onFacilitySelect: (id: string) => void;
}

// Custom icon SVGs encoded as data URIs to avoid broken default marker images
const USER_ICON = L.divIcon({
  html: `<div style="width:18px;height:18px;background:#3b82f6;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(59,130,246,0.5);"></div>`,
  className: '',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const FACILITY_ICON = L.divIcon({
  html: `<div style="width:28px;height:28px;display:flex;align-items:center;justify-content:center;background:#ef4444;border:2px solid #fff;border-radius:8px;box-shadow:0 2px 8px rgba(239,68,68,0.4);font-size:14px;">🏥</div>`,
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28],
});

const FACILITY_SELECTED_ICON = L.divIcon({
  html: `<div style="width:34px;height:34px;display:flex;align-items:center;justify-content:center;background:#dc2626;border:3px solid #fff;border-radius:10px;box-shadow:0 3px 12px rgba(220,38,38,0.6);font-size:17px;">🏥</div>`,
  className: '',
  iconSize: [34, 34],
  iconAnchor: [17, 34],
  popupAnchor: [0, -34],
});

export default function FacilityMap({
  facilities,
  userLat,
  userLng,
  radiusKm,
  selectedFacilityId,
  onFacilitySelect,
}: FacilityMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const radiusCircleRef = useRef<L.Circle | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [userLat || 19.076, userLng || 72.8777], // Default: Mumbai
      zoom: 12,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map);

    markersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update user position and radius circle
  useEffect(() => {
    const map = mapRef.current;
    if (!map || userLat === null || userLng === null) return;

    // User marker
    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([userLat, userLng]);
    } else {
      userMarkerRef.current = L.marker([userLat, userLng], { icon: USER_ICON })
        .addTo(map)
        .bindPopup('<strong>Your Location</strong>');
    }

    // Radius circle
    if (radiusCircleRef.current) {
      radiusCircleRef.current.setLatLng([userLat, userLng]);
      radiusCircleRef.current.setRadius(radiusKm * 1000);
    } else {
      radiusCircleRef.current = L.circle([userLat, userLng], {
        radius: radiusKm * 1000,
        color: '#3b82f6',
        fillColor: '#3b82f6',
        fillOpacity: 0.06,
        weight: 1.5,
        dashArray: '6 4',
      }).addTo(map);
    }

    // Fit view to radius
    map.fitBounds(radiusCircleRef.current.getBounds(), { padding: [30, 30] });
  }, [userLat, userLng, radiusKm]);

  // Update facility markers
  useEffect(() => {
    const markers = markersRef.current;
    if (!markers) return;

    markers.clearLayers();

    facilities.forEach((facility) => {
      const isSelected = facility.id === selectedFacilityId;
      const marker = L.marker([facility.latitude, facility.longitude], {
        icon: isSelected ? FACILITY_SELECTED_ICON : FACILITY_ICON,
        zIndexOffset: isSelected ? 1000 : 0,
      });

      marker.bindPopup(
        `<div style="min-width:180px">
          <strong style="font-size:13px">${facility.name}</strong>
          <div style="font-size:11px;color:#666;margin:4px 0">${facility.type}${facility.isVerified ? ' ✓' : ''}</div>
          <div style="font-size:11px;color:#666">${facility.address}</div>
          <div style="font-size:12px;color:#3b82f6;font-weight:600;margin-top:4px">${facility.distanceKm} km away</div>
          <div style="font-size:11px;margin-top:4px">📞 ${facility.phone}</div>
        </div>`
      );

      marker.on('click', () => {
        onFacilitySelect(facility.id);
      });

      markers.addLayer(marker);
    });
  }, [facilities, selectedFacilityId, onFacilitySelect]);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-border bg-muted">
      <div ref={mapContainerRef} className="w-full h-[400px] lg:h-[500px]" />

      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-card/95 backdrop-blur-sm rounded-xl border border-border px-3 py-2 shadow-lg">
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow-sm" />
            <span className="text-muted-foreground">You</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm">🏥</span>
            <span className="text-muted-foreground">Facility</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full border-2 border-blue-500/30 border-dashed" />
            <span className="text-muted-foreground">{radiusKm} km radius</span>
          </div>
        </div>
      </div>
    </div>
  );
}
