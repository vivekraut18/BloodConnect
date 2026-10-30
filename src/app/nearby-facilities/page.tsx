import React from 'react';
import AppLayout from '@/components/AppLayout';
import NearbyFacilitiesContent from './components/NearbyFacilitiesContent';

export default function NearbyFacilitiesPage() {
  return (
    <AppLayout activeRoute="/nearby-facilities">
      <NearbyFacilitiesContent />
    </AppLayout>
  );
}
