import React from 'react';
import AppLayout from '@/components/AppLayout';
import DonorDashboardContent from './components/DonorDashboardContent';

export default function DonorDashboardPage() {
  return (
    <AppLayout activeRoute="/donor-dashboard">
      <DonorDashboardContent />
    </AppLayout>
  );
}