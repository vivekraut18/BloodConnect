'use client';
import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Clock, LayoutDashboard, Calendar, Droplets } from 'lucide-react';
import DonorKpiGrid from './DonorKpiGrid';
import AvailabilityPanel from './AvailabilityPanel';
import NearbyRequestsFeed from './NearbyRequestsFeed';
import DonationHistoryTable from './DonationHistoryTable';
import DonorProfileSummary from './DonorProfileSummary';
import CreateBloodRequest from '@/components/CreateBloodRequest';

type ActiveTab = 'overview' | 'requests' | 'appointments' | 'history' | 'profile';

const DASHBOARD_TABS = [
  { value: 'overview' as const, label: 'Overview', Icon: LayoutDashboard },
  { value: 'requests' as const, label: 'My Requests', Icon: Droplets },
  { value: 'appointments' as const, label: 'Appointments', Icon: Calendar },
];

export default function DonorDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = searchParams.get('tab');

  const initialTab: ActiveTab =
    rawTab === 'requests'
      ? 'requests'
      : rawTab === 'appointments'
      ? 'appointments'
      : rawTab === 'history'
      ? 'history'
      : rawTab === 'profile'
      ? 'profile'
      : 'overview';

  const [activeSection, setActiveSection] = useState<ActiveTab>(initialTab);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (
      tabParam === 'requests' ||
      tabParam === 'appointments' ||
      tabParam === 'history' ||
      tabParam === 'profile'
    ) {
      setActiveSection(tabParam as ActiveTab);
    } else {
      setActiveSection('overview');
    }
  }, [searchParams]);

  const handleTabChange = (tab: 'overview' | 'requests' | 'appointments') => {
    setActiveSection(tab);
    if (tab === 'overview') {
      router.push('/donor-dashboard');
    } else {
      router.push(`/donor-dashboard?tab=${tab}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {activeSection === 'requests'
              ? 'My Blood Requests'
              : activeSection === 'history'
              ? 'Donation History'
              : activeSection === 'profile'
              ? 'Profile & Verification'
              : 'Donor Dashboard'}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {activeSection === 'requests'
              ? 'Track and manage blood requests requested by your account'
              : activeSection === 'history'
              ? 'View and verify your historical blood donation records and certificates'
              : activeSection === 'profile'
              ? 'Manage your personal details, contact info, blood group, and verification status'
              : 'Manage your blood donations, active requests, and appointments'}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-card border border-border rounded-lg px-3 py-2">
          <Clock size={13} />
          <span>Real-Time Sync</span>
          <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />
          <span className="text-success font-medium">Connected</span>
        </div>
      </div>

      {/* Dashboard Top Tabs — Overview, My Requests, Appointments */}
      {(activeSection === 'overview' ||
        activeSection === 'requests' ||
        activeSection === 'appointments') && (
        <div className="flex rounded-xl border border-border bg-muted p-1 max-w-md">
          {DASHBOARD_TABS.map((s) => (
            <button
              key={`dash-tab-${s.value}`}
              onClick={() => handleTabChange(s.value)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                activeSection === s.value
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <s.Icon size={14} />
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* Overview View */}
      {activeSection === 'overview' && (
        <div className="space-y-6 fade-in">
          {/* KPI grid */}
          <DonorKpiGrid />

          {/* Two-column layout */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Left: Availability + Profile Summary */}
            <div className="space-y-5">
              <AvailabilityPanel />
              <DonorProfileSummary isFullPage={false} />
            </div>

            {/* Right: Nearby requests */}
            <div className="xl:col-span-2">
              <NearbyRequestsFeed scope="all" />
            </div>
          </div>
        </div>
      )}

      {/* My Requests View */}
      {activeSection === 'requests' && (
        <div className="fade-in space-y-4">
          <div className="flex items-center justify-end">
            <CreateBloodRequest onCreated={() => setRefreshKey((k) => k + 1)} />
          </div>
          <NearbyRequestsFeed
            key={`my-requests-${refreshKey}`}
            scope="mine"
            title="My Blood Requests"
            subtitle="Blood requests created and submitted by your account"
          />
        </div>
      )}

      {/* Appointments View */}
      {activeSection === 'appointments' && (
        <div className="fade-in bg-card border border-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <h2 className="text-lg font-bold text-foreground">Upcoming Appointments</h2>
              <p className="text-sm text-muted-foreground">
                Scheduled donation appointments with verified blood banks and hospitals.
              </p>
            </div>
            <span className="text-xs bg-primary-light text-primary border border-blue-200 px-2.5 py-1 rounded-full font-bold">
              1 Scheduled
            </span>
          </div>

          <div className="p-4 rounded-xl bg-muted/60 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-bold text-foreground">Apollo Hospital Blood Centre</p>
              <p className="text-xs font-mono text-muted-foreground">Appointment ID: APT-2026-091</p>
              <p className="text-xs text-primary font-semibold">Scheduled Date: Upcoming Saturday, 10:00 AM</p>
              <p className="text-xs text-muted-foreground">Location: Andheri East, Mumbai</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-success-bg text-success border border-green-200 px-3 py-1 rounded-full font-bold">
                Confirmed by Center
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Donation History View (Navigated from Activity Sidebar) */}
      {activeSection === 'history' && (
        <div className="fade-in">
          <DonationHistoryTable />
        </div>
      )}

      {/* Profile & Verification View (Navigated from Account Sidebar or Header Dropdown) */}
      {activeSection === 'profile' && (
        <div className="fade-in">
          <DonorProfileSummary isFullPage={true} />
        </div>
      )}
    </div>
  );
}