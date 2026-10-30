import React, { Suspense } from 'react';
import AppLayout from '@/components/AppLayout';
import DonorDashboardContent from './components/DonorDashboardContent';

export default function DonorDashboardPage() {
  return (
    <AppLayout activeRoute="/donor-dashboard">
      <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading Donor Dashboard…</div>}>
        <DonorDashboardContent />
      </Suspense>
    </AppLayout>
  );
}