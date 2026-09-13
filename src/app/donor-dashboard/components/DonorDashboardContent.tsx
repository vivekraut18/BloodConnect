'use client';
import React, { useState } from 'react';
import { Clock, LayoutDashboard, FileText, Bell } from 'lucide-react';
import DonorKpiGrid from './DonorKpiGrid';
import AvailabilityPanel from './AvailabilityPanel';
import NearbyRequestsFeed from './NearbyRequestsFeed';
import DonationHistoryTable from './DonationHistoryTable';
import DonorProfileSummary from './DonorProfileSummary';

const SECTIONS = [
  { value: 'overview' as const, label: 'Overview', Icon: LayoutDashboard },
  { value: 'history' as const, label: 'Donation History', Icon: FileText },
  { value: 'settings' as const, label: 'Notification Settings', Icon: Bell },
];

const NOTIF_SETTINGS = [
  {
    label: 'Request Alerts',
    items: [
      { key: 'emergencyAlerts', label: 'Emergency Requests', description: 'Always on — cannot be disabled. Immediate alerts for emergency blood needs near you.' },
      { key: 'urgentAlerts', label: 'Urgent Requests', description: 'Alerts for urgent (non-emergency) blood requests within your search radius.' },
      { key: 'standardAlerts', label: 'Standard Requests', description: 'Alerts for standard blood requests. Throttled to max 3 per day.' },
    ],
  },
  {
    label: 'Channels',
    items: [
      { key: 'smsAlerts', label: 'SMS Alerts', description: 'Receive SMS for emergency and urgent requests. Standard network rates apply.' },
      { key: 'emailDigest', label: 'Email Digest', description: 'Daily summary of nearby requests and your donation activity.' },
    ],
  },
  {
    label: 'Special Programs',
    items: [
      { key: 'rareBloodOpt', label: 'Rare Blood Group Alerts', description: 'Opt in to receive alerts for rare blood group requests (AB-, B-, O-) across a wider radius.' },
      { key: 'quietHoursEnabled', label: 'Enable Quiet Hours', description: 'Pause non-emergency notifications during a specified time window.' },
    ],
  },
];

export default function DonorDashboardContent() {
  const [activeSection, setActiveSection] = useState<'overview' | 'history' | 'settings'>('overview');

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Donor Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Welcome back, Arjun. Here&apos;s your donation activity and nearby requests.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-card border border-border rounded-lg px-3 py-2">
          <Clock size={13} />
          <span>Last synced: 13 Sep 2026, 10:03 AM</span>
          <span className="w-1.5 h-1.5 rounded-full bg-success" />
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex rounded-xl border border-border bg-muted p-1 w-full sm:w-auto sm:inline-flex">
        {SECTIONS.map((s) => (
          <button
            key={`dash-section-${s.value}`}
            onClick={() => setActiveSection(s.value)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
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

      {activeSection === 'overview' && (
        <div className="space-y-6 fade-in">
          {/* KPI grid */}
          <DonorKpiGrid />

          {/* Two-column layout */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Left: Availability + Profile */}
            <div className="space-y-5">
              <AvailabilityPanel />
              <DonorProfileSummary />
            </div>

            {/* Right: Nearby requests */}
            <div className="xl:col-span-2">
              <NearbyRequestsFeed />
            </div>
          </div>
        </div>
      )}

      {activeSection === 'history' && (
        <div className="fade-in">
          <DonationHistoryTable />
        </div>
      )}

      {activeSection === 'settings' && (
        <div className="fade-in">
          <NotificationSettings />
        </div>
      )}
    </div>
  );
}

function NotificationSettings() {
  const [prefs, setPrefs] = useState({
    emergencyAlerts: true,
    urgentAlerts: true,
    standardAlerts: false,
    emailDigest: true,
    smsAlerts: true,
    rareBloodOpt: false,
    quietHoursEnabled: true,
    quietStart: '22:00',
    quietEnd: '07:00',
  });

  const toggle = (key: keyof typeof prefs) => {
    if (typeof prefs[key] === 'boolean') {
      setPrefs((p) => ({ ...p, [key]: !p[key] }));
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-6 max-w-2xl">
      <h2 className="text-base font-bold text-foreground mb-1">Notification Preferences</h2>
      <p className="text-sm text-muted-foreground mb-5">
        Control how and when BloodConnect contacts you about blood requests. Emergency alerts are always delivered regardless of quiet hours.
      </p>

      <div className="space-y-5">
        {NOTIF_SETTINGS.map((group) => (
          <div key={`notif-group-${group.label}`}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{group.label}</p>
            <div className="space-y-3">
              {group.items.map((item) => (
                <div key={`notif-item-${item.key}`} className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                  <button
                    onClick={() => toggle(item.key as keyof typeof prefs)}
                    className={`relative w-10 h-5 rounded-full transition-colors duration-200 flex-shrink-0 mt-0.5 ${
                      prefs[item.key as keyof typeof prefs] ? 'bg-primary' : 'bg-border'
                    } ${item.key === 'emergencyAlerts' ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                    disabled={item.key === 'emergencyAlerts'}
                    aria-checked={!!prefs[item.key as keyof typeof prefs]}
                    role="switch"
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
                        prefs[item.key as keyof typeof prefs] ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Quiet hours */}
        {prefs.quietHoursEnabled && (
          <div className="pt-3 border-t border-border fade-in">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Quiet Hours</p>
            <p className="text-xs text-muted-foreground mb-3">
              Non-emergency notifications will be held during quiet hours and delivered after.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Start</label>
                <input
                  type="time"
                  value={prefs.quietStart}
                  onChange={(e) => setPrefs((p) => ({ ...p, quietStart: e.target.value }))}
                  className="input-field text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">End</label>
                <input
                  type="time"
                  value={prefs.quietEnd}
                  onChange={(e) => setPrefs((p) => ({ ...p, quietEnd: e.target.value }))}
                  className="input-field text-sm"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 pt-4 border-t border-border flex gap-2">
        <button className="btn-primary px-5 py-2.5 rounded-xl text-sm font-semibold">
          Save Preferences
        </button>
        <button className="px-4 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground border border-border hover:bg-muted transition-colors">
          Reset to Default
        </button>
      </div>
    </div>
  );
}