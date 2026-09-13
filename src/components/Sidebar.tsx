'use client';
import React from 'react';
import Link from 'next/link';
import AppLogo from './ui/AppLogo';
import { LayoutDashboard, Droplets, Search, Bell, Calendar, FileText, Settings, ChevronLeft, ChevronRight, ShieldCheck, LogOut, X,  } from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggleCollapse: () => void;
  onMobileClose: () => void;
  activeRoute?: string;
}

const navGroups = [
  {
    label: 'Main',
    items: [
      { label: 'Donor Dashboard', href: '/donor-dashboard', icon: LayoutDashboard, badge: null },
      { label: 'Find Blood', href: '/find-blood-search', icon: Search, badge: null },
      { label: 'My Requests', href: '/donor-dashboard', icon: Droplets, badge: '2' },
    ],
  },
  {
    label: 'Activity',
    items: [
      { label: 'Appointments', href: '/donor-dashboard', icon: Calendar, badge: '1' },
      { label: 'Donation History', href: '/donor-dashboard', icon: FileText, badge: null },
      { label: 'Notifications', href: '/donor-dashboard', icon: Bell, badge: '4' },
    ],
  },
  {
    label: 'Account',
    items: [
      { label: 'Profile & Verification', href: '/donor-dashboard', icon: ShieldCheck, badge: null },
      { label: 'Settings', href: '/donor-dashboard', icon: Settings, badge: null },
    ],
  },
];

export default function Sidebar({ collapsed, mobileOpen, onToggleCollapse, onMobileClose, activeRoute }: SidebarProps) {
  const sidebarWidth = collapsed ? 'w-16' : 'w-60';
  const isActive = (href: string) => activeRoute === href;

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col bg-card border-r border-border ${sidebarWidth} transition-all duration-300 ease-in-out flex-shrink-0 relative z-20`}
      >
        <SidebarContent
          collapsed={collapsed}
          onToggleCollapse={onToggleCollapse}
          isActive={isActive}
          showCollapseBtn
        />
      </aside>

      {/* Mobile sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col bg-card border-r border-border w-64 transform transition-transform duration-300 ease-in-out lg:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <AppLogo size={32} />
            <span className="font-bold text-foreground text-base">BloodConnect</span>
          </div>
          <button
            onClick={onMobileClose}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>
        <SidebarContent collapsed={false} isActive={isActive} />
      </aside>
    </>
  );
}

function SidebarContent({
  collapsed,
  onToggleCollapse,
  isActive,
  showCollapseBtn,
}: {
  collapsed: boolean;
  onToggleCollapse?: () => void;
  isActive: (href: string) => boolean;
  showCollapseBtn?: boolean;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center border-b border-border py-4 ${collapsed ? 'justify-center px-0' : 'px-4 gap-2'}`}>
        <AppLogo size={32} />
        {!collapsed && (
          <span className="font-bold text-foreground text-sm leading-tight">BloodConnect</span>
        )}
        {showCollapseBtn && (
          <button
            onClick={onToggleCollapse}
            className={`ml-auto p-1 rounded-lg hover:bg-muted text-muted-foreground transition-colors ${collapsed ? 'mx-auto' : ''}`}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        )}
      </div>

      {/* Donor identity card */}
      {!collapsed && (
        <div className="mx-3 mt-3 p-3 rounded-xl bg-primary-light border border-blue-200">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">
              AM
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">Arjun Mehta</p>
              <p className="text-xs text-muted-foreground truncate">BC-2026-04821</p>
            </div>
            <ShieldCheck size={14} className="text-success flex-shrink-0 ml-auto" />
          </div>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="text-xs font-bold text-emergency bg-emergency-bg border border-red-200 px-2 py-0.5 rounded-full">
              B+
            </span>
            <span className="text-xs text-success font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />
              Available
            </span>
          </div>
        </div>
      )}

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin py-3 px-2">
        {navGroups.map((group) => (
          <div key={`nav-group-${group.label}`} className="mb-4">
            {!collapsed && (
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-2 mb-1.5">
                {group.label}
              </p>
            )}
            {group.items.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={`nav-${item.label}`}
                  href={item.href}
                  className={`flex items-center gap-3 px-2.5 py-2 rounded-lg mb-0.5 transition-all duration-150 group relative ${
                    active
                      ? 'bg-primary-light text-primary font-semibold' :'text-muted-foreground hover:bg-muted hover:text-foreground'
                  } ${collapsed ? 'justify-center' : ''}`}
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon size={18} strokeWidth={active ? 2.5 : 2} className="flex-shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="text-sm flex-1 truncate">{item.label}</span>
                      {item.badge && (
                        <span className="ml-auto text-xs font-semibold bg-primary text-white rounded-full min-w-[1.25rem] h-5 flex items-center justify-center px-1.5">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                  {collapsed && item.badge && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary" />
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom logout */}
      <div className={`border-t border-border p-3 ${collapsed ? 'flex justify-center' : ''}`}>
        <Link
          href="/sign-up-login-screen"
          className={`flex items-center gap-3 px-2.5 py-2 rounded-lg text-muted-foreground hover:bg-error-bg hover:text-error transition-all duration-150 ${collapsed ? 'justify-center' : ''}`}
          title={collapsed ? 'Sign Out' : undefined}
        >
          <LogOut size={18} />
          {!collapsed && <span className="text-sm">Sign Out</span>}
        </Link>
      </div>
    </div>
  );
}