'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { Menu, Bell, Search, AlertTriangle, ChevronDown } from 'lucide-react';

interface TopbarProps {
  onMobileMenuToggle: () => void;
  sidebarCollapsed?: boolean;
}

const MOCK_NOTIFICATIONS = [
  {
    id: 'notif-001',
    title: '⚡ Emergency: B+ blood needed',
    body: 'Apollo Hospital, Andheri needs 3 units of B+ urgently. 2.4 km from you.',
    time: '5 min ago',
    read: false,
  },
  {
    id: 'notif-002',
    title: 'Request BL-2026-04731 updated',
    body: 'Your response to the B+ request at Lilavati Hospital has been acknowledged.',
    time: '1 hr ago',
    read: false,
  },
  {
    id: 'notif-003',
    title: 'Donation confirmed ✓',
    body: 'Hinduja Hospital has confirmed your donation on 10 Sep 2026. Certificate ready.',
    time: '2 days ago',
    read: false,
  },
  {
    id: 'notif-004',
    title: 'Next eligible donation date',
    body: "You'll be eligible to donate again from 10 Dec 2026 (90 days from last donation).",
    time: '2 days ago',
    read: true,
  },
];

export default function Topbar({ onMobileMenuToggle }: TopbarProps) {
  const [notifOpen, setNotifOpen] = useState(false);

  return (
    <header className="h-14 bg-card border-b border-border flex items-center px-4 gap-3 flex-shrink-0 z-10">
      {/* Mobile menu toggle */}
      <button
        onClick={onMobileMenuToggle}
        className="lg:hidden p-2 rounded-lg hover:bg-muted text-muted-foreground"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      {/* Emergency banner */}
      <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emergency-bg border border-red-200 text-emergency text-xs font-semibold">
        <AlertTriangle size={13} strokeWidth={2.5} />
        <span>3 Emergency Requests Near You</span>
      </div>

      <div className="flex-1" />

      {/* Quick search */}
      <Link
        href="/find-blood-search"
        className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-sm hover:bg-border transition-colors"
      >
        <Search size={14} />
        <span>Find Blood</span>
        <span className="text-xs bg-background border border-border rounded px-1 py-0.5 font-mono">⌘K</span>
      </Link>

      {/* Notifications */}
      <div className="relative">
        <button
          onClick={() => setNotifOpen((p) => !p)}
          className="relative p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
          aria-label="Notifications"
          aria-expanded={notifOpen}
        >
          <Bell size={18} />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emergency border-2 border-card" />
        </button>

        {notifOpen && (
          <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-lg z-50 fade-in overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">Notifications</span>
              <span className="text-xs bg-emergency text-white rounded-full px-2 py-0.5 font-semibold">4 new</span>
            </div>
            <div className="max-h-72 overflow-y-auto scrollbar-thin">
              {MOCK_NOTIFICATIONS.map((n) => (
                <div
                  key={`notif-${n.id}`}
                  className={`px-4 py-3 border-b border-border last:border-0 hover:bg-muted/50 cursor-pointer transition-colors ${!n.read ? 'bg-primary-light/30' : ''}`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${n.read ? 'bg-border' : 'bg-primary'}`} />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground">{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.body}</p>
                      <p className="text-xs text-muted-foreground mt-1">{n.time}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-4 py-2.5 border-t border-border">
              <button className="text-xs text-primary font-semibold hover:underline">View all notifications</button>
            </div>
          </div>
        )}
      </div>

      {/* User avatar */}
      <div className="flex items-center gap-2 cursor-pointer group">
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">
          AM
        </div>
        <div className="hidden sm:block">
          <p className="text-xs font-semibold text-foreground leading-tight">Arjun Mehta</p>
          <p className="text-xs text-muted-foreground">Donor</p>
        </div>
        <ChevronDown size={14} className="text-muted-foreground" />
      </div>
    </header>
  );
}